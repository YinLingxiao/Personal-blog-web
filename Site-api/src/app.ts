import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";
import type { RuntimeConfig } from "./config.js";
import type { auth as Auth } from "./auth.js";
import { providerStatus } from "./auth.js";
import { ContentStore } from "./content/content-store.js";
import { createRequireSuperAdmin } from "./middleware/require-super-admin.js";
import { createAdminRateLimit } from "./middleware/rate-limit.js";
import { createAdminContentRouter } from "./routes/admin-content.js";
import type Database from "better-sqlite3";

export function createApp(config: RuntimeConfig, auth: typeof Auth, database: Database.Database) {
  const app = express();
  if (config.production) app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path.startsWith("/api/admin")) res.setHeader("Cache-Control", "no-store");
    next();
  });

  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.trustedOrigins.includes(origin)) callback(null, true);
      else callback(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
    credentials: true,
    maxAge: 86400,
  }));

  app.all("/api/auth/*splat", toNodeHandler(auth));
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", providers: providerStatus });
  });

  const store = new ContentStore(config, database);
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
    createRequireSuperAdmin(auth),
    createAdminRateLimit(config.upload.attemptsPerHour),
  ));

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[site-api] request failed", error);
    if (res.headersSent) return;
    res.status(500).json({ code: "INTERNAL_ERROR", message: "服务暂时不可用" });
  });

  return app;
}
