import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterEach, expect, it, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { loadConfig } from "../config.js";
import { ContentPublisher } from "../content/content-publisher.js";
import { ContentStore } from "../content/content-store.js";
import { createDatabase } from "../db.js";
import { createAdminContentRouter } from "./admin-content.js";
import { createPublicContentRouter } from "./public-content.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
});

async function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moqian-http-upload-"));
  const blog = path.join(root, "blog");
  const note = path.join(root, "note");
  fs.mkdirSync(blog);
  fs.mkdirSync(note);
  const database = createDatabase(path.join(root, "auth.sqlite"));
  const config = loadConfig({
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:8787",
    BLOG_CONTENT_ROOT: blog,
    NOTE_CONTENT_ROOT: note,
    PUBLISHED_CONTENT_ROOT: path.join(root, "published"),
    DATABASE_PATH: path.join(root, "auth.sqlite"),
  });
  const publisher = new ContentPublisher(config);
  const app = express();
  app.use(express.json());
  app.use("/api/admin", createAdminContentRouter(
    config,
    new ContentStore(config, database),
    publisher,
    (req, _res, next) => {
      req.admin = { id: "test-admin", email: "test@example.com", name: "Test", role: "super_admin" };
      next();
    },
    (_req, _res, next) => next(),
  ));
  app.use("/api/content", createPublicContentRouter(publisher));
  const server = app.listen(0);
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  cleanups.push(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { base: `http://127.0.0.1:${address.port}`, blog, note, publisher };
}

async function upload(base: string, target: "blog" | "note", slug: string, markdown: string, image?: Buffer) {
  const origin = target === "blog" ? "http://localhost:3000" : "http://localhost:3001";
  const csrfResponse = await fetch(`${base}/api/admin/csrf`, { headers: { Origin: origin } });
  expect(csrfResponse.status).toBe(200);
  const { token } = await csrfResponse.json() as { token: string };
  const form = new FormData();
  form.set("category", target === "blog" ? "随笔" : "数学");
  form.append("file_0", new File([markdown], "index.md", { type: "text/markdown" }));
  const files = [{ partId: "file_0", relativePath: `${slug}/index.md` }];
  if (image) {
    form.append("file_1", new File([new Uint8Array(image)], "cover.png", { type: "image/png" }));
    files.push({ partId: "file_1", relativePath: `${slug}/cover.png` });
  }
  form.set("manifest", JSON.stringify({ slug, files }));
  return fetch(`${base}/api/admin/content/${target}`, {
    method: "POST",
    headers: { Origin: origin, "X-CSRF-Token": token },
    body: form,
  });
}

it("accepts a blog folder upload, publishes it, serves its image, and rejects the duplicate", async () => {
  const { base, blog } = await fixture();
  const image = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.writeUInt32BE(1, 16);
  image.writeUInt32BE(1, 20);
  const first = await upload(base, "blog", "upload-test", "---\ntitle: Upload test\ndate: 2026-09-27\ncover: ./cover.png\n---\nBody.\n", image);
  expect(first.status).toBe(201);
  expect(await first.json()).toMatchObject({ stored: true, published: true, slug: "upload-test", fileCount: 2 });
  expect(fs.existsSync(path.join(blog, "随笔", "upload-test", "index.md"))).toBe(true);
  const index = await fetch(`${base}/api/content/blog/index.json`);
  expect(index.status).toBe(200);
  expect((await index.json() as Array<{ id: string }>).map((item) => item.id)).toContain("upload-test");
  expect((await fetch(`${base}/api/content/blog/posts/upload-test/cover.png`)).status).toBe(200);
  const duplicate = await upload(base, "blog", "upload-test", "# Replacement");
  expect(duplicate.status).toBe(409);
  expect(await duplicate.json()).toMatchObject({ code: "SLUG_EXISTS" });
});

it("saves a draft note without making it public", async () => {
  const { base, note } = await fixture();
  const response = await upload(base, "note", "draft-note", "---\ntitle: Draft note\ndraft: true\n---\nPrivate.\n");
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ stored: true, published: false, slug: "draft-note" });
  expect(fs.existsSync(path.join(note, "数学", "draft-note", "index.md"))).toBe(true);
  const index = await fetch(`${base}/api/content/note/index.json`);
  expect(index.status).toBe(200);
  expect((await index.json() as Array<{ id: string }>).map((item) => item.id)).not.toContain("draft-note");
});

it("returns the actual published URL when a saved note gets a reserved slug prefix", async () => {
  const { base, note, publisher } = await fixture();
  const previous = path.join(note, "历史", "topic");
  fs.mkdirSync(previous, { recursive: true });
  fs.writeFileSync(path.join(previous, "index.md"), "# Old note\n");
  await publisher.publish("note");
  fs.rmSync(previous, { recursive: true });
  const response = await upload(base, "note", "topic", "# New note\n");
  expect(response.status).toBe(201);
  expect(await response.json()).toMatchObject({ published: true, slug: "topic", publishedSlug: "数学--topic" });
  const origin = "http://localhost:3001";
  const csrf = await fetch(`${base}/api/admin/csrf?action=publish`, { headers: { Origin: origin } });
  const { token } = await csrf.json() as { token: string };
  const retry = await fetch(`${base}/api/admin/content/note/publish`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify({ slug: "topic" }),
  });
  expect(retry.status).toBe(200);
  expect(await retry.json()).toMatchObject({ published: true, publishedSlug: "数学--topic" });
});

async function update(base: string, slug: string, revision: string, markdown: string, category = "随笔", image?: Buffer) {
  const origin = "http://localhost:3000";
  const csrf = await fetch(`${base}/api/admin/csrf?action=update`, { headers: { Origin: origin } });
  const { token } = await csrf.json() as { token: string };
  const form = new FormData();
  form.set("category", category);
  form.set("revision", revision);
  form.append("file_0", new File([markdown], "index.md"));
  const files = [{ partId: "file_0", relativePath: `${slug}/index.md` }];
  if (image) {
    form.append("file_1", new File([new Uint8Array(image)], "cover.png"));
    files.push({ partId: "file_1", relativePath: `${slug}/cover.png` });
  }
  form.set("manifest", JSON.stringify({ slug, files }));
  return fetch(`${base}/api/admin/content/blog/${slug}`, { method: "PUT", headers: { Origin: origin, "X-CSRF-Token": token }, body: form });
}

it("manages drafts, updates a published post without changing its URL, and downloads reusable backups", async () => {
  const { base, blog } = await fixture();
  await upload(base, "blog", "editable-post", "---\ntitle: Original\ndate: 2026-10-01\n---\nOld body");
  await upload(base, "blog", "draft-post", "---\ntitle: Draft\ndraft: true\n---\nSecret");
  const list = await fetch(`${base}/api/admin/content/blog`);
  expect(list.headers.get("cache-control")).toBe("private, no-store");
  expect(await list.json()).toEqual(expect.arrayContaining([expect.objectContaining({ slug: "editable-post", published: true }), expect.objectContaining({ slug: "draft-post", draft: true, published: false })]));
  const source = await (await fetch(`${base}/api/admin/content/blog/editable-post`)).json() as { revision: string };
  const replacement = "---\ntitle: Updated\ndate: 2026-10-01\ncategory: 技术\n---\nNew body with $x$ and [[Draft]]";
  const response = await update(base, "editable-post", source.revision, replacement, "技术");
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ slug: "editable-post", stored: true, published: true, revision: expect.any(String) });
  const index = await (await fetch(`${base}/api/content/blog/index.json`)).json();
  expect(index).toEqual([expect.objectContaining({ id: "editable-post", title: "Updated", category: "技术", content: expect.stringContaining("New body") })]);
  expect(fs.existsSync(path.join(blog, "随笔", "editable-post"))).toBe(false);
  const stale = await update(base, "editable-post", source.revision, "stale body");
  expect(stale.status).toBe(409);
  expect(await stale.json()).toMatchObject({ code: "REVISION_CONFLICT" });
  for (const [version, content] of [["", replacement], ["?version=previous", "---\ntitle: Original\ndate: 2026-10-01\n---\nOld body"]]) {
    const zip = await fetch(`${base}/api/admin/content/blog/editable-post/download${version}`);
    expect(zip.status).toBe(200);
    expect(strFromU8(unzipSync(new Uint8Array(await zip.arrayBuffer()))["editable-post/index.md"])).toBe(content);
  }
});

it("saves updates on publication failure, preserves the public version, and supports retry", async () => {
  const { base, publisher } = await fixture();
  await upload(base, "blog", "editable-post", "---\ntitle: Original\n---\nOld body");
  const source = await (await fetch(`${base}/api/admin/content/blog/editable-post`)).json() as { revision: string };
  const spy = vi.spyOn(publisher, "publish").mockRejectedValueOnce(new Error("simulated publication failure"));
  const response = await update(base, "editable-post", source.revision, "---\ntitle: Updated\n---\nNew body");
  expect(response.status).toBe(202);
  expect(await response.json()).toMatchObject({ stored: true, published: false, publishFailed: true, revision: expect.any(String) });
  spy.mockRestore();
  const index = await (await fetch(`${base}/api/content/blog/index.json`)).json();
  expect(index).toEqual([expect.objectContaining({ title: "Original", content: "Old body" })]);
  expect(await (await fetch(`${base}/api/admin/content/blog`)).json()).toEqual([expect.objectContaining({ publishFailed: true, published: true })]);
  expect((await (await fetch(`${base}/api/admin/content/blog/editable-post`)).json() as { markdown: string }).markdown).toContain("New body");
  const origin = "http://localhost:3000";
  const { token } = await (await fetch(`${base}/api/admin/csrf?action=publish`, { headers: { Origin: origin } })).json() as { token: string };
  const retry = await fetch(`${base}/api/admin/content/blog/publish`, { method: "POST", headers: { Origin: origin, "X-CSRF-Token": token, "Content-Type": "application/json" }, body: JSON.stringify({ slug: "editable-post" }) });
  expect(retry.status).toBe(200);
  expect(await retry.json()).toMatchObject({ published: true });
  expect(await (await fetch(`${base}/api/admin/content/blog`)).json()).toEqual([expect.objectContaining({ publishFailed: false, published: true })]);
  expect(await (await fetch(`${base}/api/content/blog/index.json`)).json()).toEqual([expect.objectContaining({ title: "Updated" })]);
});

it("replaces same-name images with new cache keys and removes omitted images", async () => {
  const { base } = await fixture();
  const image = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(image);
  image.writeUInt32BE(1, 16); image.writeUInt32BE(1, 20);
  const markdown = "---\ntitle: Images\ncover: ./cover.png\n---\n![cover](./cover.png)";
  await upload(base, "blog", "image-post", markdown, image);
  const first = await (await fetch(`${base}/api/content/blog/index.json`)).json() as Array<{ cover: string }>;
  const source = await (await fetch(`${base}/api/admin/content/blog/image-post`)).json() as { revision: string };
  const changed = Buffer.from(image); changed.writeUInt32BE(2, 16);
  expect((await update(base, "image-post", source.revision, markdown, "随笔", changed)).status).toBe(200);
  const second = await (await fetch(`${base}/api/content/blog/index.json`)).json() as Array<{ cover: string }>;
  expect(second[0].cover).not.toBe(first[0].cover);
  const current = await (await fetch(`${base}/api/admin/content/blog/image-post`)).json() as { revision: string };
  expect((await update(base, "image-post", current.revision, "# No images")).status).toBe(200);
  expect((await fetch(`${base}/api/content/blog/posts/image-post/cover.png`)).status).toBe(404);
});

it("rejects updates without valid CSRF and refuses update operations for notes", async () => {
  const { base } = await fixture();
  expect((await fetch(`${base}/api/admin/content/blog/demo`, { method: "PUT" })).status).toBe(403);
  expect((await fetch(`${base}/api/admin/content/blog/demo/images/..%5Cprivate.png`)).status).toBe(400);
  const origin = "http://localhost:3001";
  const { token } = await (await fetch(`${base}/api/admin/csrf?action=update`, { headers: { Origin: origin } })).json() as { token: string };
  const form = new FormData(); form.set("category", "数学"); form.set("revision", "a".repeat(64)); form.set("manifest", JSON.stringify({ slug: "demo", files: [] }));
  expect((await fetch(`${base}/api/admin/content/note/demo`, { method: "PUT", headers: { Origin: origin, "X-CSRF-Token": token }, body: form })).status).toBe(400);
});
