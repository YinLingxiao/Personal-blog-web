import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { RuntimeConfig } from "../config.js";
import type { ContentTarget } from "./content-store.js";

const runFile = promisify(execFile);
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type PublishedItem = { id: string; sourceSlug?: string; category?: string };

export class ContentPublisher {
  private readonly current = new Map<ContentTarget, string>();
  private readonly pending = new Map<ContentTarget, Promise<PublishedItem[]>>();

  constructor(private readonly config: RuntimeConfig) {}

  private targetRoot(target: ContentTarget) {
    return path.join(this.config.publishedContentRoot, target);
  }

  private async restore(target: ContentTarget) {
    const cached = this.current.get(target);
    if (cached) return cached;
    try {
      const name = (await fs.readFile(path.join(this.targetRoot(target), "current.txt"), "utf8")).trim();
      if (!/^snapshot-[a-f0-9-]{36}$/.test(name)) return null;
      const directory = path.join(this.targetRoot(target), name);
      if (!(await fs.stat(path.join(directory, "index.json"))).isFile()) return null;
      this.current.set(target, directory);
      return directory;
    } catch {
      return null;
    }
  }

  async directory(target: ContentTarget) {
    const existing = await this.restore(target);
    if (existing) return existing;
    const running = this.pending.get(target);
    if (running) await running;
    else await this.publish(target);
    return this.current.get(target)!;
  }

  private async prune(target: ContentTarget) {
    const root = this.targetRoot(target);
    const active = path.basename(this.current.get(target) || "");
    const entries = await fs.readdir(root, { withFileTypes: true });
    const snapshots = await Promise.all(entries
      .filter((entry) => entry.isDirectory() && /^snapshot-[a-f0-9-]{36}$/.test(entry.name))
      .map(async (entry) => ({ name: entry.name, modified: (await fs.stat(path.join(root, entry.name))).mtimeMs })));
    snapshots.sort((a, b) => b.modified - a.modified);
    for (const entry of snapshots.slice(3)) {
      if (entry.name !== active && Date.now() - entry.modified > 5 * 60_000) {
        await fs.rm(path.join(root, entry.name), { recursive: true, force: true });
      }
    }
  }

  async publish(target: ContentTarget): Promise<PublishedItem[]> {
    const previous = this.pending.get(target);
    const work = (async () => {
      if (previous) await previous.catch(() => undefined);
      const root = this.targetRoot(target);
      const source = target === "blog" ? this.config.blogContentRoot : this.config.noteContentRoot;
      if (!(await fs.stat(source)).isDirectory()) throw new Error("Content root is not a directory");
      await fs.mkdir(root, { recursive: true, mode: 0o750 });
      const name = `snapshot-${crypto.randomUUID()}`;
      const directory = path.join(root, name);
      await fs.mkdir(directory, { mode: 0o750 });
      const prefix = target === "blog" ? "BLOG" : "NOTE";
      const script = path.join(repositoryRoot, target === "blog" ? "Blog" : "Note", "scripts", "build-notes.mjs");
      try {
        const previousOutput = target === "note" ? await this.restore(target) : null;
        await runFile(process.execPath, [script], {
          cwd: path.dirname(script),
          env: {
            ...process.env,
            [`${prefix}_CONTENT_ROOT`]: target === "blog" ? this.config.blogContentRoot : this.config.noteContentRoot,
            [`${prefix}_OUTPUT_ROOT`]: directory,
            [`${prefix}_ASSET_BASE`]: `${this.config.authUrl}/api/content/${target}`,
            [`${prefix}_RSS_SELF`]: `${this.config.authUrl}/api/content/${target}/rss.xml`,
            ...(target === "note" ? { NOTE_PREVIOUS_OUTPUT: previousOutput || "" } : {}),
          },
          timeout: 120_000,
          maxBuffer: 1024 * 1024,
        });
        const items = JSON.parse(await fs.readFile(path.join(directory, "index.json"), "utf8")) as PublishedItem[];
        if (!Array.isArray(items) || items.some((item) => !item || typeof item.id !== "string")) {
          throw new Error("Generated content index is invalid");
        }
        await fs.stat(path.join(directory, "latest.json"));
        await fs.stat(path.join(directory, "rss.xml"));
        const pointer = path.join(root, `current-${crypto.randomUUID()}.tmp`);
        await fs.writeFile(pointer, `${name}\n`, { mode: 0o640 });
        await fs.rename(pointer, path.join(root, "current.txt"));
        this.current.set(target, directory);
        const cleanup = setTimeout(() => {
          void this.prune(target).catch((error) => console.error("[site-api] snapshot cleanup failed", error));
        }, 5 * 60_000);
        cleanup.unref();
        return items;
      } catch (error) {
        await fs.rm(directory, { recursive: true, force: true });
        throw error;
      }
    })();
    this.pending.set(target, work);
    try {
      return await work;
    } finally {
      if (this.pending.get(target) === work) this.pending.delete(target);
    }
  }
}
