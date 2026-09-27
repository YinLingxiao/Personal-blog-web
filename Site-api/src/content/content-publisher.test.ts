import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import { afterEach, expect, it } from "vitest";
import { loadConfig } from "../config.js";
import { ContentPublisher } from "./content-publisher.js";
import { createPublicContentRouter } from "../routes/public-content.js";

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
