import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterEach, expect, it } from "vitest";
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
  return { base: `http://127.0.0.1:${address.port}`, blog, note };
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
