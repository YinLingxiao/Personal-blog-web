import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

export function createDatabase(databasePath: string) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const database = new Database(databasePath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");
  database.exec(`
    CREATE TABLE IF NOT EXISTS content_upload_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      target TEXT NOT NULL CHECK (target IN ('blog', 'note')),
      category TEXT NOT NULL,
      slug TEXT NOT NULL,
      file_count INTEGER NOT NULL,
      byte_count INTEGER NOT NULL,
      status TEXT NOT NULL,
      request_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS content_upload_audit_user_created
      ON content_upload_audit(user_id, created_at);

    CREATE TABLE IF NOT EXISTS guestbook_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER,
      deleted_by TEXT
    );
    CREATE INDEX IF NOT EXISTS guestbook_entries_public_order
      ON guestbook_entries(created_at DESC, id DESC)
      WHERE deleted_at IS NULL;
    CREATE INDEX IF NOT EXISTS guestbook_entries_user_created
      ON guestbook_entries(user_id, created_at);
  `);
  return database;
}
