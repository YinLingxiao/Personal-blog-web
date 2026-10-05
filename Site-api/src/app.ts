import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import type { RuntimeConfig } from "./config.js";
import { providerStatus, type SiteAuth } from "./auth.js";
import { ContentStore } from "./content/content-store.js";
import { ContentPublisher } from "./content/content-publisher.js";
import { createRequireSuperAdmin } from "./middleware/require-super-admin.js";
import { createRequireUser } from "./middleware/require-user.js";
import { createAdminRateLimit } from "./middleware/rate-limit.js";
import { createAdminContentRouter } from "./routes/admin-content.js";
import { createPublicContentRouter } from "./routes/public-content.js";
import { createGuestbookRouter } from "./routes/guestbook.js";
import { createSessionRouter } from "./routes/session.js";
import type Database from "better-sqlite3";

export function createApp(config: RuntimeConfig, auth: SiteAuth, database: Database.Database) {
  const app = express();
  if (config.production) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path.startsWith("/api/admin") || req.path.startsWith("/api/guestbook") || req.path.startsWith("/api/session")) {
      res.setHeader("Cache-Control", "private, no-store");
    }
    next();
  });

  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.trustedOrigins.includes(origin)) callback(null, true);
      else callback(null, false);
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
    credentials: true,
    maxAge: 86400,
  }));

  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", providers: providerStatus(config) });
  });

  const store = new ContentStore(config, database);
  const publisher = new ContentPublisher(config);
  setImmediate(() => {
    try {
      store.cleanupStaging();
    } catch (error) {
      console.error("[site-api] staging cleanup failed", error);
    }
  });
  app.use("/api/admin", createAdminContentRouter(
    config,
    store,
    publisher,
    createRequireSuperAdmin(auth),
    createAdminRateLimit(config.upload.attemptsPerHour),
  ));
  app.use("/api/content", createPublicContentRouter(publisher, { requireNoteViewer: createRequireUser(auth) }));
  app.use("/api/session", createSessionRouter(config, auth));
  app.use("/api/guestbook", createGuestbookRouter(config, auth, database));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof SyntaxError && "status" in error && (error as { status?: number }).status === 400) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "请求格式不正确" });
      return;
    }
    console.error("[site-api] request failed", error instanceof Error ? error.stack || error.name : "unknown");
    if (res.headersSent) return;
    res.status(500).json({ code: "INTERNAL_ERROR", message: "服务暂时不可用" });
  });

  return app;
}
