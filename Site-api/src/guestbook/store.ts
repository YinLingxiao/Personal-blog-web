import crypto from "node:crypto";
import type { Database } from "better-sqlite3";
import { encodeCursor } from "./text.js";
import type { GuestbookViewer } from "../middleware/require-user.js";

export const GUESTBOOK_PAGE_SIZE = 20;
const MAX_PER_MINUTE = 5;
const MAX_PER_HOUR = 30;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;

export interface GuestbookEntry {
  id: string;
  body: string;
  createdAt: number;
  author: {
    name: string;
    image: string | null;
    owner: boolean;
  };
  canDelete: boolean;
}

interface Row {
  id: string;
  user_id: string;
  body: string;
  created_at: number;
  author_name: string | null;
  author_image: string | null;
  author_role: string | null;
}

function present(row: Row, viewer: GuestbookViewer | null): GuestbookEntry {
  const image = row.author_image?.trim() || null;
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      name: row.author_name?.trim() || "访客",
      image,
      owner: row.author_role === "super_admin",
    },
    canDelete: Boolean(viewer && (viewer.role === "super_admin" || viewer.id === row.user_id)),
  };
}

function retryAfter(oldest: number | null, windowMs: number, now: number) {
  if (oldest == null) return Math.ceil(windowMs / 1000);
  return Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
}

export class GuestbookStore {
  constructor(private readonly database: Database) {}

  list(cursor: { t: number; id: string } | null, limit: number, viewer: GuestbookViewer | null) {
    const where = cursor
      ? "g.deleted_at IS NULL AND (g.created_at < ? OR (g.created_at = ? AND g.id < ?))"
      : "g.deleted_at IS NULL";
    const params = cursor ? [cursor.t, cursor.t, cursor.id, limit + 1] : [limit + 1];
    const rows = this.database.prepare(`
      SELECT g.id, g.user_id, g.body, g.created_at,
             u.name AS author_name, u.image AS author_image, u.role AS author_role
      FROM guestbook_entries g
      LEFT JOIN "user" u ON u.id = g.user_id
      WHERE ${where}
      ORDER BY g.created_at DESC, g.id DESC
      LIMIT ?
    `).all(...params) as Row[];
    const page = rows.slice(0, limit);
    const last = page.at(-1);
    return {
      items: page.map((row) => present(row, viewer)),
      nextCursor: rows.length > limit && last ? encodeCursor(last.created_at, last.id) : null,
    };
  }

  create(viewer: GuestbookViewer, body: string, now = Date.now()) {
    const minuteAgo = now - MINUTE_MS;
    const hourAgo = now - HOUR_MS;
    const id = crypto.randomUUID();
    return this.database.transaction(() => {
      const counts = this.database.prepare(`
        SELECT
          COALESCE(SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END), 0) AS per_minute,
          COALESCE(SUM(CASE WHEN created_at > ? THEN 1 ELSE 0 END), 0) AS per_hour,
          MIN(CASE WHEN created_at > ? THEN created_at END) AS oldest_minute,
          MIN(CASE WHEN created_at > ? THEN created_at END) AS oldest_hour
        FROM guestbook_entries
        WHERE user_id = ?
      `).get(minuteAgo, hourAgo, minuteAgo, hourAgo, viewer.id) as {
        per_minute: number;
        per_hour: number;
        oldest_minute: number | null;
        oldest_hour: number | null;
      };
      const waits: number[] = [];
      if (Number(counts.per_minute) >= MAX_PER_MINUTE) waits.push(retryAfter(counts.oldest_minute, MINUTE_MS, now));
      if (Number(counts.per_hour) >= MAX_PER_HOUR) waits.push(retryAfter(counts.oldest_hour, HOUR_MS, now));
      if (waits.length) return { ok: false as const, retryAfter: Math.max(...waits) };
      this.database.prepare(`
        INSERT INTO guestbook_entries (id, user_id, body, created_at, deleted_at, deleted_by)
        VALUES (?, ?, ?, ?, NULL, NULL)
      `).run(id, viewer.id, body, now);
      const row = this.entry(id);
      if (!row) throw new Error("guestbook insert was not readable");
      return { ok: true as const, entry: present(row, viewer) };
    })();
  }

  remove(viewer: GuestbookViewer, id: string, now = Date.now()) {
    const existing = this.database.prepare(`
      SELECT user_id AS userId, deleted_at AS deletedAt
      FROM guestbook_entries
      WHERE id = ?
    `).get(id) as { userId: string; deletedAt: number | null } | undefined;
    if (!existing || existing.deletedAt != null) return "missing" as const;
    if (viewer.role !== "super_admin" && existing.userId !== viewer.id) return "forbidden" as const;
    const result = this.database.prepare(`
      UPDATE guestbook_entries
      SET deleted_at = ?, deleted_by = ?
      WHERE id = ? AND deleted_at IS NULL
    `).run(now, viewer.id, id);
    return result.changes === 1 ? "ok" as const : "missing" as const;
  }

  private entry(id: string) {
    return this.database.prepare(`
      SELECT g.id, g.user_id, g.body, g.created_at,
             u.name AS author_name, u.image AS author_image, u.role AS author_role
      FROM guestbook_entries g
      LEFT JOIN "user" u ON u.id = g.user_id
      WHERE g.id = ?
    `).get(id) as Row | undefined;
  }
}
