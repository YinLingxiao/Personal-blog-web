import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { createDatabase } from "../db.js";
import { ContentStore } from "./content-store.js";

const cleanups: Array<() => void> = [];
afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moqian-upload-"));
  const blog = path.join(root, "blog");
  const note = path.join(root, "note");
  const databasePath = path.join(root, "auth.sqlite");
  const database = createDatabase(databasePath);
  const config = loadConfig({
    BLOG_CONTENT_ROOT: blog,
    NOTE_CONTENT_ROOT: note,
    DATABASE_PATH: databasePath,
  });
  cleanups.push(() => {
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { blog, note, config, database, store: new ContentStore(config, database) };
}

function markdownFile(text = "# Hello") {
  return new File([text], "index.md", { type: "text/markdown" });
}

function validInput(slug = "hello-world") {
  return {
    target: "blog" as const,
    category: "技术",
    manifest: { slug, files: [{ partId: "p0", relativePath: `${slug}/index.md` }] },
    parts: [{ partId: "p0", file: markdownFile() }],
    userId: "admin-1",
    requestId: "request-1",
  };
}

describe("ContentStore", () => {
  it("stores a new page bundle without building outputs", async () => {
    const { blog, database, store } = fixture();
    const result = await store.store(validInput());
    expect(result.slug).toBe("hello-world");
    expect(fs.readFileSync(path.join(blog, "技术", "hello-world", "index.md"), "utf8")).toBe("# Hello");
    if (process.platform !== "win32") {
      expect(fs.statSync(path.join(blog, "技术", "hello-world")).mode & 0o777).toBe(0o755);
    }
    expect(fs.existsSync(path.join(blog, "dist"))).toBe(false);
    const audit = database.prepare("SELECT status FROM content_upload_audit").get() as { status: string };
    expect(audit.status).toBe("stored");
  });

  it("rejects existing slugs without changing source", async () => {
    const { blog, store } = fixture();
    fs.mkdirSync(path.join(blog, "随笔", "hello-world"), { recursive: true });
    fs.writeFileSync(path.join(blog, "随笔", "hello-world", "index.md"), "original");
    await expect(store.store(validInput())).rejects.toMatchObject({ status: 409, code: "SLUG_EXISTS" });
    expect(fs.readFileSync(path.join(blog, "随笔", "hello-world", "index.md"), "utf8")).toBe("original");
  });

  it("allows exactly one of concurrent same-slug uploads", async () => {
    const { store } = fixture();
    const results = await Promise.allSettled([store.store(validInput()), store.store(validInput())]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });
  });

  it("rejects a frontmatter category that disagrees with the destination", async () => {
    const { store } = fixture();
    const input = validInput();
    input.parts[0].file = markdownFile("---\ncategory: 随笔\n---\n# Hello");
    await expect(store.store(input)).rejects.toThrow("不一致");
  });

  it("rejects manifest mismatches and unsafe paths", async () => {
    const { store } = fixture();
    const mismatch = validInput();
    mismatch.manifest.files[0].partId = "missing";
    await expect(store.store(mismatch)).rejects.toThrow("清单与文件不一致");

    const unsafe = validInput();
    unsafe.manifest.files[0].relativePath = "hello-world\\index.md";
    await expect(store.store(unsafe)).rejects.toThrow("路径不合法");
  });
});
