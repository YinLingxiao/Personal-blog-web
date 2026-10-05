import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { serializeSignedCookie } from "better-call";
import { getMigrations } from "better-auth/db/migration";
import { afterEach, expect, it } from "vitest";
import { createAuth, type SiteAuth } from "../auth.js";
import { loadConfig, type RuntimeConfig } from "../config.js";
import { createDatabase } from "../db.js";
import { createApp } from "../app.js";

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
});

function seedSnapshot(publishedRoot: string, target: "blog" | "note") {
  const name = `snapshot-${crypto.randomUUID()}`;
  const directory = path.join(publishedRoot, target, name);
  fs.mkdirSync(path.join(directory, "posts", "demo"), { recursive: true });
  const index = [{ id: "demo", title: "Demo", content: "secret body", category: "数学", tags: [], updatedAt: 0 }];
  fs.writeFileSync(path.join(directory, "index.json"), JSON.stringify(index));
  fs.writeFileSync(path.join(directory, "latest.json"), JSON.stringify({ items: [] }));
  fs.writeFileSync(path.join(directory, "rss.xml"), "<rss/>");
  fs.writeFileSync(path.join(directory, "posts", "demo", "a.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  fs.writeFileSync(path.join(publishedRoot, target, "current.txt"), name);
}

async function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moqian-content-auth-"));
  const published = path.join(root, "published");
  for (const target of ["blog", "note"] as const) {
    fs.mkdirSync(path.join(root, target));
    seedSnapshot(published, target);
  }
  const databasePath = path.join(root, "auth.sqlite");
  const database = createDatabase(databasePath);
  const config = loadConfig({
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:8787",
    BLOG_CONTENT_ROOT: path.join(root, "blog"),
    NOTE_CONTENT_ROOT: path.join(root, "note"),
    PUBLISHED_CONTENT_ROOT: published,
    DATABASE_PATH: databasePath,
  });
  const auth = createAuth(config, database);
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  const server = createApp(config, auth, database).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  cleanups.push(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    database.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { base: `http://127.0.0.1:${address.port}`, auth, config };
}

async function memberCookie(auth: SiteAuth, config: RuntimeConfig) {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({ email: "reader@example.com", name: "Reader", image: null });
  const session = await context.internalAdapter.createSession(user.id);
  const cookieName = context.authCookies.sessionToken.name;
  const pair = (await serializeSignedCookie(cookieName, session.token, config.secret)).split(";")[0];
  return `${cookieName}=${decodeURIComponent(pair.slice(pair.indexOf("=") + 1))}`;
}

it("hides note bodies and images from anonymous visitors", async () => {
  const { base } = await fixture();
  const index = await fetch(`${base}/api/content/note/index.json`);
  expect(index.status).toBe(401);
  expect(await index.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  expect((await fetch(`${base}/api/content/note/posts/demo/a.png`)).status).toBe(401);
});

it("keeps note titles, feeds and the blog public", async () => {
  const { base } = await fixture();
  const catalog = await fetch(`${base}/api/content/note/catalog.json`);
  expect(catalog.status).toBe(200);
  expect(JSON.stringify(await catalog.json())).not.toContain("secret body");
  expect((await fetch(`${base}/api/content/note/latest.json`)).status).toBe(200);
  expect((await fetch(`${base}/api/content/note/rss.xml`)).status).toBe(200);
  expect((await fetch(`${base}/api/content/blog/index.json`)).status).toBe(200);
  const blogImage = await fetch(`${base}/api/content/blog/posts/demo/a.png`);
  expect(blogImage.status).toBe(200);
  expect(blogImage.headers.get("cache-control")).toBe("public, max-age=300");
});

it("serves note bodies and images to any signed-in reader", async () => {
  const { base, auth, config } = await fixture();
  const cookie = await memberCookie(auth, config);
  const index = await fetch(`${base}/api/content/note/index.json`, { headers: { Cookie: cookie } });
  expect(index.status).toBe(200);
  expect(await index.json()).toEqual([expect.objectContaining({ id: "demo", content: "secret body" })]);
  const image = await fetch(`${base}/api/content/note/posts/demo/a.png`, { headers: { Cookie: cookie } });
  expect(image.status).toBe(200);
  expect(image.headers.get("cache-control")).toBe("private, max-age=300");
});

it("protects blog source, downloads, backups and update endpoints from visitors and ordinary members", async () => {
  const { base, auth, config } = await fixture();
  const member = await memberCookie(auth, config);
  for (const [cookie, expected] of [["", 401], [member, 403]] as const) {
    const headers = cookie ? { Cookie: cookie } : undefined;
    for (const path of ["", "/demo", "/demo/download", "/demo/download?version=previous", "/demo/images/a.png"]) {
      expect((await fetch(`${base}/api/admin/content/blog${path}`, { headers })).status).toBe(expected);
    }
    expect((await fetch(`${base}/api/admin/content/blog/demo`, { method: "PUT", headers })).status).toBe(expected);
  }
  const preflight = await fetch(`${base}/api/admin/content/blog/demo`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "PUT", "Access-Control-Request-Headers": "X-CSRF-Token" } });
  expect(preflight.headers.get("access-control-allow-methods")).toContain("PUT");
});
