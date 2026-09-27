import { Router, type Response } from "express";
import type { Database } from "better-sqlite3";
import type { RuntimeConfig } from "../config.js";
import type { SiteAuth } from "../auth.js";
import { GuestbookStore, GUESTBOOK_PAGE_SIZE } from "../guestbook/store.js";
import { decodeCursor, isGuestbookId, normalizeGuestbookBody } from "../guestbook/text.js";
import { createRequireUser, readViewer, type ViewerRequest } from "../middleware/require-user.js";
import { verifyCsrfToken } from "../security/csrf.js";
import { trustedOrigin } from "../security/origin.js";

function readLimit(value: unknown) {
  if (value == null) return GUESTBOOK_PAGE_SIZE;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const limit = Number(value);
  if (limit < 1 || limit > GUESTBOOK_PAGE_SIZE) return null;
  return limit;
}

function csrfOk(config: RuntimeConfig, req: ViewerRequest, action: string) {
  const origin = trustedOrigin(req, config);
  const token = req.get("x-csrf-token") || "";
  return Boolean(origin && req.viewer && verifyCsrfToken(config, token, { userId: req.viewer.id, origin, action }));
}

export function createGuestbookRouter(config: RuntimeConfig, auth: SiteAuth, database: Database) {
  const router = Router();
  const store = new GuestbookStore(database);
  const requireUser = createRequireUser(auth);

  router.get("/", async (req, res, next) => {
    try {
      const limit = readLimit(req.query.limit);
      if (limit == null) {
        res.status(400).json({ code: "INVALID_REQUEST", message: "分页数量无效" });
        return;
      }
      let cursor: { t: number; id: string } | null = null;
      if (req.query.cursor != null) {
        if (typeof req.query.cursor !== "string") {
          res.status(400).json({ code: "INVALID_CURSOR", message: "分页参数无效" });
          return;
        }
        cursor = decodeCursor(req.query.cursor);
        if (!cursor) {
          res.status(400).json({ code: "INVALID_CURSOR", message: "分页参数无效" });
          return;
        }
      }
      let viewer = null;
      try {
        viewer = await readViewer(auth, req);
      } catch (error) {
        console.error("[site-api] guestbook session lookup failed", error instanceof Error ? error.name : "unknown");
      }
      res.setHeader("Cache-Control", "private, no-store");
      res.json(store.list(cursor, limit, viewer));
    } catch (error) {
      next(error);
    }
  });

  router.post("/", requireUser, (req: ViewerRequest, res: Response, next) => {
    try {
      if (!req.is("application/json")) {
        res.status(415).json({ code: "UNSUPPORTED_MEDIA_TYPE", message: "请使用 JSON 提交留言" });
        return;
      }
      if (!csrfOk(config, req, "guestbook-create")) {
        res.status(403).json({ code: "INVALID_CSRF", message: "请求校验失败，请刷新后重试" });
        return;
      }
      const payload = req.body;
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        res.status(400).json({ code: "INVALID_REQUEST", message: "请求格式不正确" });
        return;
      }
      const keys = Object.keys(payload as Record<string, unknown>);
      if (keys.length !== 1 || keys[0] !== "body") {
        res.status(400).json({ code: "INVALID_REQUEST", message: "请求字段不正确" });
        return;
      }
      const body = normalizeGuestbookBody((payload as { body?: unknown }).body);
      if (!body.ok) {
        res.status(400).json({ code: "INVALID_CONTENT", message: body.message });
        return;
      }
      const created = store.create(req.viewer!, body.body);
      if (!created.ok) {
        res.setHeader("Retry-After", String(created.retryAfter));
        res.status(429).json({ code: "RATE_LIMITED", message: "留言太频繁，请稍后再试" });
        return;
      }
      res.status(201).json(created.entry);
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:id", requireUser, (req: ViewerRequest, res: Response, next) => {
    try {
      const id = req.params.id;
      if (typeof id !== "string" || !isGuestbookId(id)) {
        res.status(400).json({ code: "INVALID_REQUEST", message: "留言编号无效" });
        return;
      }
      if (!csrfOk(config, req, "guestbook-delete")) {
        res.status(403).json({ code: "INVALID_CSRF", message: "请求校验失败，请刷新后重试" });
        return;
      }
      const result = store.remove(req.viewer!, id);
      if (result === "missing") {
        res.status(404).json({ code: "NOT_FOUND", message: "留言不存在或已删除" });
        return;
      }
      if (result === "forbidden") {
        res.status(403).json({ code: "FORBIDDEN", message: "只能删除自己的留言" });
        return;
      }
      res.json({ deleted: true });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
