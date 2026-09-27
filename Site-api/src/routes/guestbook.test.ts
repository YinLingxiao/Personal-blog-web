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
const origin = "http://localhost:8080";

afterEach(async () => {
  while (cleanups.length) await cleanups.pop()?.();
});

async function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "moqian-guestbook-"));
  const blog = path.join(root, "blog");
  const note = path.join(root, "note");
  fs.mkdirSync(blog);
  fs.mkdirSync(note);
  const databasePath = path.join(root, "auth.sqlite");
  const database = createDatabase(databasePath);
  let closed = false;
  const closeDatabase = () => {
    if (closed) return;
    closed = true;
    database.close();
  };
  const config = loadConfig({
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:8787",
    BLOG_CONTENT_ROOT: blog,
    NOTE_CONTENT_ROOT: note,
    PUBLISHED_CONTENT_ROOT: path.join(root, "published"),
    DATABASE_PATH: databasePath,
  });
  const auth = createAuth(config, database);
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
  const app = createApp(config, auth, database);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no port");
  cleanups.push(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    closeDatabase();
    fs.rmSync(root, { recursive: true, force: true });
  });
  return { base: `http://127.0.0.1:${address.port}`, auth, config, database, databasePath, closeDatabase };
}

async function account(auth: SiteAuth, config: RuntimeConfig, database: ReturnType<typeof createDatabase>, input: { email: string; name: string; role?: "user" | "super_admin"; image?: string | null }) {
  const context = await auth.$context;
  const user = await context.internalAdapter.createUser({
    email: input.email,
    name: input.name,
    image: input.image ?? null,
  });
  if (input.role) database.prepare('UPDATE "user" SET role = ? WHERE id = ?').run(input.role, user.id);
  const session = await context.internalAdapter.createSession(user.id);
  const cookieName = context.authCookies.sessionToken.name;
  const serialized = await serializeSignedCookie(cookieName, session.token, config.secret);
  const pair = serialized.split(";")[0];
  const value = decodeURIComponent(pair.slice(pair.indexOf("=") + 1));
  return { id: user.id, cookie: `${cookieName}=${value}` };
}

async function csrf(base: string, cookie: string, action: string) {
  const response = await fetch(`${base}/api/session/csrf?action=${encodeURIComponent(action)}`, {
    headers: { Origin: origin, Cookie: cookie },
  });
  expect(response.status).toBe(200);
  const payload = await response.json() as { token: string };
  return payload.token;
}

function post(base: string, cookie: string, token: string, body: unknown) {
  return fetch(`${base}/api/guestbook`, {
    method: "POST",
    headers: {
      Origin: origin,
      Cookie: cookie,
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(body),
  });
}

async function publish(base: string, cookie: string, text: string) {
  const token = await csrf(base, cookie, "guestbook-create");
  const response = await post(base, cookie, token, { body: text });
  expect(response.status).toBe(201);
  return response.json() as Promise<{ id: string; body: string; canDelete: boolean; author: { name: string; owner: boolean; image: string | null } }>;
}

function keysOf(value: unknown, found = new Set<string>()) {
  if (!value || typeof value !== "object") return found;
  for (const [key, child] of Object.entries(value)) {
    found.add(key);
    if (Array.isArray(child)) child.forEach((item) => keysOf(item, found));
    else keysOf(child, found);
  }
  return found;
}

it("lets visitors read and blocks anonymous writes", async () => {
  const { base } = await fixture();
  const listed = await fetch(`${base}/api/guestbook`);
  expect(listed.status).toBe(200);
  expect(await listed.json()).toEqual({ items: [], nextCursor: null });
  const created = await fetch(`${base}/api/guestbook`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ body: "你好" }),
  });
  expect(created.status).toBe(401);
  expect(await created.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  const removed = await fetch(`${base}/api/guestbook/11111111-1111-4111-8111-111111111111`, {
    method: "DELETE",
    headers: { Origin: origin },
  });
  expect(removed.status).toBe(401);
  const hostile = await fetch(`${base}/api/guestbook`, { headers: { Origin: "https://evil.example" } });
  expect(hostile.status).toBe(200);
  expect(hostile.headers.get("access-control-allow-origin")).toBeNull();
  const preflight = await fetch(`${base}/api/guestbook/11111111-1111-4111-8111-111111111111`, {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "DELETE",
      "Access-Control-Request-Headers": "content-type,x-csrf-token",
    },
  });
  expect(preflight.headers.get("access-control-allow-methods")).toMatch(/DELETE/);
});

it("lets a member publish and delete only their own plain text", async () => {
  const env = await fixture();
  const member = await account(env.auth, env.config, env.database, { email: "member@example.com", name: "读者", image: "https://example.com/a.png" });
  const other = await account(env.auth, env.config, env.database, { email: "other@example.com", name: "另一位" });
  const script = "<script>alert(1)</script>\n下一行";
  const entry = await publish(env.base, member.cookie, `  ${script}  `);
  expect(entry.body).toBe(script);
  expect(entry.canDelete).toBe(true);
  expect(entry.author).toEqual({ name: "读者", image: "https://example.com/a.png", owner: false });
  const listed = await fetch(`${env.base}/api/guestbook`, { headers: { Cookie: member.cookie } });
  const payload = await listed.json();
  expect(keysOf(payload).has("email")).toBe(false);
  expect(payload.items).toHaveLength(1);
  const foreign = await publish(env.base, other.cookie, "别人的话");
  const createToken = await csrf(env.base, member.cookie, "guestbook-create");
  const wrongAction = await fetch(`${env.base}/api/guestbook/${foreign.id}`, {
    method: "DELETE",
    headers: { Origin: origin, Cookie: member.cookie, "X-CSRF-Token": createToken },
  });
  expect(wrongAction.status).toBe(403);
  const deleteToken = await csrf(env.base, member.cookie, "guestbook-delete");
  const forbidden = await fetch(`${env.base}/api/guestbook/${foreign.id}`, {
    method: "DELETE",
    headers: { Origin: origin, Cookie: member.cookie, "X-CSRF-Token": deleteToken },
  });
  expect(forbidden.status).toBe(403);
  const removed = await fetch(`${env.base}/api/guestbook/${entry.id}`, {
    method: "DELETE",
    headers: { Origin: origin, Cookie: member.cookie, "X-CSRF-Token": deleteToken },
  });
  expect(removed.status).toBe(200);
  const after = await fetch(`${env.base}/api/guestbook`);
  const ids = ((await after.json()) as { items: Array<{ id: string }> }).items.map((item) => item.id);
  expect(ids).toEqual([foreign.id]);
  const adminGate = await fetch(`${env.base}/api/admin/csrf`, { headers: { Origin: origin, Cookie: member.cookie } });
  expect(adminGate.status).toBe(403);
  const uploadAction = await fetch(`${env.base}/api/session/csrf?action=content-upload`, { headers: { Origin: origin, Cookie: member.cookie } });
  expect(uploadAction.status).toBe(400);
});

it("lets a super admin delete any entry and still requires the admin csrf gate", async () => {
  const env = await fixture();
  const member = await account(env.auth, env.config, env.database, { email: "writer@example.com", name: "作者" });
  const admin = await account(env.auth, env.config, env.database, { email: "owner@example.com", name: "墨浅", role: "super_admin" });
  const entry = await publish(env.base, member.cookie, "留下");
  const own = await publish(env.base, admin.cookie, "站主的话");
  const visible = await fetch(`${env.base}/api/guestbook`);
  const items = ((await visible.json()) as { items: Array<{ id: string; author: { owner: boolean }; canDelete: boolean }> }).items;
  expect(items.find((item) => item.id === own.id)?.author.owner).toBe(true);
  expect(items.find((item) => item.id === entry.id)?.canDelete).toBe(false);
  const asAdmin = await fetch(`${env.base}/api/guestbook`, { headers: { Cookie: admin.cookie } });
  const managed = ((await asAdmin.json()) as { items: Array<{ id: string; canDelete: boolean }> }).items;
  expect(managed.every((item) => item.canDelete)).toBe(true);
  const token = await csrf(env.base, admin.cookie, "guestbook-delete");
  const removed = await fetch(`${env.base}/api/guestbook/${entry.id}`, {
    method: "DELETE",
    headers: { Origin: origin, Cookie: admin.cookie, "X-CSRF-Token": token },
  });
  expect(removed.status).toBe(200);
  const adminCsrf = await fetch(`${env.base}/api/admin/csrf`, { headers: { Origin: origin, Cookie: admin.cookie } });
  expect(adminCsrf.status).toBe(200);
});

it("rejects blank, oversized, malformed, and repeated posts without resetting the quota", async () => {
  const env = await fixture();
  const member = await account(env.auth, env.config, env.database, { email: "rate@example.com", name: "频繁" });
  const token = await csrf(env.base, member.cookie, "guestbook-create");
  const blank = await post(env.base, member.cookie, token, { body: "  \n\t" });
  expect(blank.status).toBe(400);
  const extra = await post(env.base, member.cookie, token, { body: "好", userId: member.id });
  expect(extra.status).toBe(400);
  const typed = await post(env.base, member.cookie, token, { body: 12 });
  expect(typed.status).toBe(400);
  const long = await post(env.base, member.cookie, token, { body: "好".repeat(501) });
  expect(long.status).toBe(400);
  const emoji = await post(env.base, member.cookie, token, { body: "😀".repeat(500) });
  expect(emoji.status).toBe(201);
  const broken = await fetch(`${env.base}/api/guestbook`, {
    method: "POST",
    headers: { Origin: origin, Cookie: member.cookie, "Content-Type": "application/json", "X-CSRF-Token": token },
    body: "{",
  });
  expect(broken.status).toBe(400);
  const untrusted = await fetch(`${env.base}/api/guestbook`, {
    method: "POST",
    headers: { Origin: "https://evil.example", Cookie: member.cookie, "Content-Type": "application/json", "X-CSRF-Token": token },
    body: JSON.stringify({ body: "不该写入" }),
  });
  expect(untrusted.status).toBe(403);
  for (let index = 0; index < 4; index += 1) await publish(env.base, member.cookie, `第 ${index} 条`);
  const blocked = await post(env.base, member.cookie, await csrf(env.base, member.cookie, "guestbook-create"), { body: "第六条" });
  expect(blocked.status).toBe(429);
  const listed = await fetch(`${env.base}/api/guestbook`);
  const ids = ((await listed.json()) as { items: Array<{ id: string }> }).items.map((item) => item.id);
  const deleteToken = await csrf(env.base, member.cookie, "guestbook-delete");
  for (const id of ids) {
    const removed = await fetch(`${env.base}/api/guestbook/${id}`, {
      method: "DELETE",
      headers: { Origin: origin, Cookie: member.cookie, "X-CSRF-Token": deleteToken },
    });
    expect(removed.status).toBe(200);
  }
  const stillBlocked = await post(env.base, member.cookie, await csrf(env.base, member.cookie, "guestbook-create"), { body: "删了也不行" });
  expect(stillBlocked.status).toBe(429);
  const hourlyUser = await account(env.auth, env.config, env.database, { email: "hour@example.com", name: "小时" });
  const now = Date.now() - 90_000;
  const insert = env.database.prepare("INSERT INTO guestbook_entries (id, user_id, body, created_at, deleted_at, deleted_by) VALUES (?, ?, ?, ?, ?, ?)");
  for (let index = 0; index < 30; index += 1) {
    insert.run(
      `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`,
      hourlyUser.id,
      "旧",
      now + index,
      index === 0 ? now : null,
      index === 0 ? hourlyUser.id : null,
    );
  }
  const hourly = await post(env.base, hourlyUser.cookie, await csrf(env.base, hourlyUser.cookie, "guestbook-create"), { body: "小时已满" });
  expect(hourly.status).toBe(429);
});

it("keeps cursor pages disjoint when a newer entry arrives", async () => {
  const env = await fixture();
  const member = await account(env.auth, env.config, env.database, { email: "page@example.com", name: "分页" });
  const insert = env.database.prepare("INSERT INTO guestbook_entries (id, user_id, body, created_at) VALUES (?, ?, ?, ?)");
  const originTime = Date.now() - 120_000;
  for (let index = 0; index < 21; index += 1) {
    insert.run(`33333333-3333-4333-8333-${String(index).padStart(12, "0")}`, member.id, `旧 ${index}`, originTime + index);
  }
  const first = await fetch(`${env.base}/api/guestbook?limit=20`);
  const page = await first.json() as { items: Array<{ id: string }>; nextCursor: string | null };
  expect(page.items).toHaveLength(20);
  expect(page.nextCursor).toBeTruthy();
  const fresh = await publish(env.base, member.cookie, "刚刚");
  const second = await fetch(`${env.base}/api/guestbook?limit=20&cursor=${encodeURIComponent(page.nextCursor || "")}`);
  const older = await second.json() as { items: Array<{ id: string }> };
  const seen = new Set(page.items.map((item) => item.id));
  expect(older.items.every((item) => !seen.has(item.id))).toBe(true);
  expect(older.items.some((item) => item.id === fresh.id)).toBe(false);
  const badCursor = await fetch(`${env.base}/api/guestbook?cursor=not-a-cursor`);
  expect(badCursor.status).toBe(400);
});

it("keeps entries after the database connection is reopened", async () => {
  const env = await fixture();
  const member = await account(env.auth, env.config, env.database, { email: "keep@example.com", name: "留存" });
  await publish(env.base, member.cookie, "重启之后还在");
  env.database.pragma("wal_checkpoint(TRUNCATE)");
  env.closeDatabase();
  const reopened = createDatabase(env.databasePath);
  const row = reopened.prepare("SELECT body, deleted_at FROM guestbook_entries").get() as { body: string; deleted_at: number | null };
  reopened.close();
  expect(row).toEqual({ body: "重启之后还在", deleted_at: null });
});
