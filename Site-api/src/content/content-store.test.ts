import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
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

  it("updates and moves a bundle, rejects stale versions, and restores a downloaded backup", async () => {
    const { store, blog, database } = fixture();
    await store.store(validInput());
    const original = store.readBlog("hello-world");
    const update = { ...validInput(), category: "随笔", revision: original.revision };
    update.parts[0].file = markdownFile("---\ntitle: New\naliases: [Old]\ncustom:\n  nested: preserved\n---\nUpdated body");
    await store.store(update);
    expect(fs.existsSync(path.join(blog, "技术", "hello-world"))).toBe(false);
    const current = store.readBlog("hello-world");
    expect(current).toMatchObject({ category: "随笔", metadata: { aliases: ["Old"], custom: { nested: "preserved" } } });
    expect(current.revision).not.toBe(original.revision);
    expect(database.prepare("SELECT new_revision FROM content_edit_audit").get()).toEqual({ new_revision: current.revision });
    await expect(store.store(update)).rejects.toMatchObject({ code: "REVISION_CONFLICT", status: 409 });
    const zip = unzipSync(store.blogZip("hello-world", true));
    expect(Object.keys(zip)).toEqual(["hello-world/index.md"]);
    expect(strFromU8(zip["hello-world/index.md"])).toBe("# Hello");
    await store.store({ ...validInput(), revision: current.revision });
    expect(store.readBlog("hello-world").markdown).toBe("# Hello");
    expect(database.prepare("SELECT * FROM content_edit_audit").all()).toHaveLength(2);
  });

  it("keeps the source and backup unchanged on invalid content or failed directory exchange", async () => {
    const { store } = fixture();
    await store.store(validInput());
    const original = store.readBlog("hello-world");
    const invalid = { ...validInput(), revision: original.revision };
    invalid.parts[0].file = markdownFile("---\ncategory: mismatched\n---\nBad");
    await expect(store.store(invalid)).rejects.toThrow("不一致");
    const rename = fs.renameSync;
    const spy = vi.spyOn(fs, "renameSync").mockImplementation((from, to) => {
      if (String(from).includes("bundle-") && String(to).endsWith("hello-world")) throw new Error("simulated disk failure");
      return rename(from, to);
    });
    try { await expect(store.store({ ...validInput(), revision: original.revision })).rejects.toThrow("disk failure"); }
    finally { spy.mockRestore(); }
    expect(store.readBlog("hello-world").revision).toBe(original.revision);
    expect(store.listBlog()[0].hasBackup).toBe(false);
  });

  it("recovers a interrupted update before staging cleanup", async () => {
    const { store, blog, database } = fixture();
    await store.store(validInput());
    const original = store.readBlog("hello-world");
    const transaction = path.join(blog, ".content-transactions", "update-crashtest");
    fs.mkdirSync(path.join(transaction, "backup"), { recursive: true });
    fs.writeFileSync(path.join(transaction, "journal.json"), JSON.stringify({ source: path.join("技术", "hello-world"), destination: path.join("技术", "hello-world"), slug: "hello-world", auditId: "crash" }));
    database.prepare("INSERT INTO content_upload_audit VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run("crash", "admin", "blog", "技术", "hello-world", 1, 1, "pending", "crash", Date.now());
    fs.renameSync(path.join(blog, "技术", "hello-world"), path.join(transaction, "original"));
    fs.mkdirSync(path.join(blog, "技术", "hello-world"));
    fs.writeFileSync(path.join(blog, "技术", "hello-world", "index.md"), "partially committed");
    store.cleanupStaging();
    expect(store.readBlog("hello-world").revision).toBe(original.revision);
    expect(fs.existsSync(transaction)).toBe(false);
  });

  it("converts a legacy flat article to a bundle while preserving its link", async () => {
    const { store, blog } = fixture();
    fs.mkdirSync(path.join(blog, "技术"), { recursive: true });
    fs.writeFileSync(path.join(blog, "技术", "legacy-post.md"), "# Legacy");
    const item = store.readBlog("legacy-post");
    await store.store({ ...validInput("legacy-post"), revision: item.revision });
    expect(fs.existsSync(path.join(blog, "技术", "legacy-post.md"))).toBe(false);
    expect(store.readBlog("legacy-post").markdown).toBe("# Hello");
    expect(strFromU8(unzipSync(store.blogZip("legacy-post", true))["legacy-post/index.md"])).toBe("# Legacy");
  });

  it("rejects over-limit and unsafe replacement bundles before touching the source", async () => {
    const { store, config } = fixture();
    await store.store(validInput());
    const original = store.readBlog("hello-world");
    config.upload.maxMarkdownBytes = 1024;
    const oversized = { ...validInput(), revision: original.revision };
    oversized.parts[0].file = markdownFile("x".repeat(1025));
    await expect(store.store(oversized)).rejects.toMatchObject({ status: 413, code: "UPLOAD_TOO_LARGE" });
    const unsafe = { ...validInput(), revision: original.revision };
    unsafe.manifest.files[0].relativePath = "hello-world/../outside.md";
    await expect(store.store(unsafe)).rejects.toThrow();
    expect(store.readBlog("hello-world").revision).toBe(original.revision);
  });

  it("supports existing non-ASCII slugs without renaming their public URLs", async () => {
    const { store, blog } = fixture();
    fs.mkdirSync(path.join(blog, "随笔", "旧博文"), { recursive: true });
    fs.writeFileSync(path.join(blog, "随笔", "旧博文", "index.md"), "# Legacy");
    const source = store.readBlog("旧博文");
    await store.store({ ...validInput("旧博文"), revision: source.revision });
    expect(store.readBlog("旧博文").slug).toBe("旧博文");
  });
});
