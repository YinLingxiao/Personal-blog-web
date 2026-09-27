import { Router, type Response } from "express";
import type { RuntimeConfig } from "../config.js";
import type { SiteAuth } from "../auth.js";
import { createRequireUser, type ViewerRequest } from "../middleware/require-user.js";
import { createCsrfToken, verifyCsrfToken } from "../security/csrf.js";
import { trustedOrigin } from "../security/origin.js";

const ACTIONS = new Set(["guestbook-create", "guestbook-delete"]);

export function createSessionRouter(config: RuntimeConfig, auth: SiteAuth) {
  const router = Router();
  router.get("/csrf", createRequireUser(auth), (req: ViewerRequest, res: Response) => {
    const action = req.query.action;
    if (typeof action !== "string" || !ACTIONS.has(action)) {
      res.status(400).json({ code: "INVALID_REQUEST", message: "缺少有效的校验动作" });
      return;
    }
    const origin = trustedOrigin(req, config);
    if (!origin) {
      res.status(403).json({ code: "INVALID_ORIGIN", message: "请求来源不受信任" });
      return;
    }
    res.setHeader("Cache-Control", "private, no-store");
    res.json({
      token: createCsrfToken(config, { userId: req.viewer!.id, origin, action }),
      expiresIn: config.upload.csrfTtlSeconds,
    });
  });
  return router;
}
