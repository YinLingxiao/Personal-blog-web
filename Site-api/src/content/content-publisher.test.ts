import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterEach, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { ContentPublisher } from "./content-publisher.js";
import { createPublicContentRouter } from "../routes/public-content.js";
import { buildNoteCatalog } from "../../../shared/content/note-catalog.mjs";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});

it("publishes uploaded content dynamically and retains the last good snapshot on failure", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "moqian-publish-test-"));
  roots.push(root);
  const blogRoot = path.join(root, "blog");
  const noteRoot = path.join(root, "note");
  const publishedRoot = path.join(root, "published");
  await fs.mkdir(path.join(blogRoot, "随笔", "first-post"), { recursive: true });
  await fs.mkdir(path.join(noteRoot, "数学", "first-note"), { recursive: true });
  await fs.writeFile(path.join(blogRoot, "随笔", "first-post", "index.md"), "---\ntitle: First post\ndate: 2026-09-26\ncover: ./cover.png\n---\n![cover](./cover.png)\n");
  await fs.writeFile(path.join(blogRoot, "随笔", "first-post", "cover.png"), "image bytes");
  await fs.writeFile(path.join(noteRoot, "数学", "first-note", "index.md"), "---\ntitle: First note\n---\nA note.\n");
  const config = loadConfig({
    NODE_ENV: "test",
    BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
    BETTER_AUTH_URL: "http://localhost:8787",
    BLOG_CONTENT_ROOT: blogRoot,
    NOTE_CONTENT_ROOT: noteRoot,
    PUBLISHED_CONTENT_ROOT: publishedRoot,
  });
  const publisher = new ContentPublisher(config);

  expect((await publisher.publish("blog")).map((item) => item.id)).toEqual(["first-post"]);
  const firstDirectory = await publisher.directory("blog");
  const firstIndex = JSON.parse(await fs.readFile(path.join(firstDirectory, "index.json"), "utf8"));
  expect(firstIndex[0].cover).toBe("http://localhost:8787/api/content/blog/posts/first-post/cover.png");
  expect(firstIndex[0].content).toContain("http://localhost:8787/api/content/blog/posts/first-post/cover.png");
  expect(await fs.readFile(path.join(firstDirectory, "posts", "first-post", "cover.png"), "utf8")).toBe("image bytes");
  expect(JSON.parse(await fs.readFile(path.join(firstDirectory, "latest.json"), "utf8"))).toHaveLength(1);
  const app = express();
  app.use("/api/content", createPublicContentRouter(publisher));
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server has no port");
    const base = `http://127.0.0.1:${address.port}/api/content/blog`;
    const image = await fetch(`${base}/posts/first-post/cover.png`);
    expect(image.status).toBe(200);
    expect(await image.text()).toBe("image bytes");
    expect((await fetch(`${base}/posts/first-post/missing.png`)).status).toBe(404);
    expect((await fetch(`${base}/index.json`)).status).toBe(200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  expect((await publisher.publish("note")).map((item) => item.id)).toEqual(["first-note"]);
  const noteDirectory = await publisher.directory("note");
  expect(JSON.parse(await fs.readFile(path.join(noteDirectory, "latest.json"), "utf8")).items).toHaveLength(1);
  const noteApp = express();
  noteApp.use("/api/content", createPublicContentRouter(publisher));
  const noteServer = noteApp.listen(0);
  try {
    const address = noteServer.address();
    if (!address || typeof address === "string") throw new Error("Test server has no port");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/content/note/catalog.json`);
    expect(response.status).toBe(200);
    const catalog = await response.json();
    expect(catalog.total).toBe(1);
    expect(catalog.categories).toEqual([{ name: "数学", count: 1 }]);
    expect(catalog.items[0]).toMatchObject({ id: "first-note", category: "数学" });
    expect(catalog.items[0]).not.toHaveProperty("content");
    const nextBundle = path.join(noteRoot, "离散数学", "second-note");
    await fs.mkdir(nextBundle, { recursive: true });
    await fs.writeFile(path.join(nextBundle, "index.md"), "# Second note\n");
    await publisher.publish("note");
    const updated = await (await fetch(`http://127.0.0.1:${address.port}/api/content/note/catalog.json`)).json();
    expect(updated.total).toBe(2);
    expect(updated.categories.map((entry: { name: string }) => entry.name)).toEqual(expect.arrayContaining(["数学", "离散数学"]));
  } finally {
    await new Promise<void>((resolve) => noteServer.close(() => resolve()));
  }

  await fs.mkdir(path.join(blogRoot, "随笔", "draft-post"), { recursive: true });
  await fs.writeFile(path.join(blogRoot, "随笔", "draft-post", "index.md"), "---\ntitle: Draft\ndraft: true\n---\nHidden.\n");
  await fs.mkdir(path.join(blogRoot, "随笔", "second-post"), { recursive: true });
  await fs.writeFile(path.join(blogRoot, "随笔", "second-post", "index.md"), "---\ntitle: Second post\ndate: 2026-09-27\n---\nPublished.\n");
  expect((await publisher.publish("blog")).map((item) => item.id).sort()).toEqual(["first-post", "second-post"]);
  const secondDirectory = await publisher.directory("blog");
  expect(secondDirectory).not.toBe(firstDirectory);
  expect(JSON.parse(await fs.readFile(path.join(secondDirectory, "latest.json"), "utf8"))).toHaveLength(2);

  await fs.mkdir(path.join(blogRoot, "技术", "first-post"), { recursive: true });
  await fs.writeFile(path.join(blogRoot, "技术", "first-post", "index.md"), "# Duplicate");
  await expect(publisher.publish("blog")).rejects.toThrow();
  expect(await publisher.directory("blog")).toBe(secondDirectory);
  const restarted = new ContentPublisher(config);
  expect(await restarted.directory("blog")).toBe(secondDirectory);
});

it("projects every published note into a stable lightweight catalog", () => {
  const source = Array.from({ length: 9 }, (_, index) => ({
    id: `笔记--${index}`, title: `主题 ${index} —— 系统总结`, category: index < 8 ? "高等数学" : "", tags: ["公式"],
    updatedAt: index, content: "a large markdown body",
  }));
  const catalog = buildNoteCatalog(source);
  expect(catalog.total).toBe(9);
  expect(catalog.categories).toEqual([{ name: "高等数学", count: 8 }, { name: "未分类", count: 1 }]);
  expect(catalog.items[0]).toEqual({ id: "笔记--8", title: "主题 8", kind: "系统总结", category: "未分类", tags: ["公式"], updatedAt: 8 });
  expect(catalog.items.every(item => !('content' in item))).toBe(true);
});

it("keeps note URLs across drafts, duplicate publication, removal and API restarts", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "moqian-note-identifiers-"));
  roots.push(root);
  const noteRoot = path.join(root, "note");
  const config = loadConfig({
    NODE_ENV: "test",
    NOTE_CONTENT_ROOT: noteRoot,
    PUBLISHED_CONTENT_ROOT: path.join(root, "published"),
  });
  const writeNote = async (category: string, markdown: string) => {
    const bundle = path.join(noteRoot, category, "topic");
    await fs.mkdir(bundle, { recursive: true });
    await fs.writeFile(path.join(bundle, "index.md"), markdown);
  };
  await writeNote("alpha", "# Alpha\n");
  const publisher = new ContentPublisher(config);
  expect((await publisher.publish("note")).map((item) => item.id)).toEqual(["topic"]);
  await fs.unlink(path.join(await publisher.directory("note"), "identifiers.json"));
  await writeNote("beta", "---\ndraft: true\n---\n# Beta\n");
  expect((await publisher.publish("note")).map((item) => item.id)).toEqual(["topic"]);

  const restarted = new ContentPublisher(config);
  await writeNote("beta", "# Beta\n");
  expect((await restarted.publish("note")).map((item) => item.id).sort()).toEqual(["beta--topic", "topic"]);
  await fs.rm(path.join(noteRoot, "alpha"), { recursive: true });
  expect((await restarted.publish("note")).map((item) => item.id)).toEqual(["beta--topic"]);
  await writeNote("alpha", "# Alpha returns\n");
  expect((await restarted.publish("note")).map((item) => item.id).sort()).toEqual(["beta--topic", "topic"]);
});

it("serves images for imported Unicode and prefixed note IDs while rejecting path traversal", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "moqian-note-images-"));
  roots.push(root);
  const noteRoot = path.join(root, "note");
  for (const category of ["数学", "Physics"]) {
    const bundle = path.join(noteRoot, category, "第一章");
    await fs.mkdir(bundle, { recursive: true });
    await fs.writeFile(path.join(bundle, "index.md"), "# Chapter\n![图](./cover.png)\n");
    await fs.writeFile(path.join(bundle, "cover.png"), `image ${category}`);
  }
  const publisher = new ContentPublisher(loadConfig({
    NODE_ENV: "test",
    NOTE_CONTENT_ROOT: noteRoot,
    PUBLISHED_CONTENT_ROOT: path.join(root, "published"),
  }));
  const items = await publisher.publish("note");
  expect(items.map((item) => item.id).sort()).toEqual(["Physics--第一章", "数学--第一章"]);
  const app = express();
  app.use("/api/content", createPublicContentRouter(publisher));
  const server = app.listen(0);
  try {
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Test server has no port");
    const base = `http://127.0.0.1:${address.port}/api/content/note/posts`;
    for (const item of items) {
      const response = await fetch(`${base}/${encodeURIComponent(item.id)}/cover.png`);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(`image ${item.category}`);
    }
    for (const slug of ["../数学--第一章", "..\\数学--第一章", "/数学--第一章", "C:数学--第一章", ".hidden"]) {
      expect((await fetch(`${base}/${encodeURIComponent(slug)}/cover.png`)).status).toBe(404);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
