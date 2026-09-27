import type { Request } from "express";
import type { RuntimeConfig } from "../config.js";

export function trustedOrigin(req: Request, config: RuntimeConfig) {
  const origin = req.get("origin") || "";
  return config.trustedOrigins.includes(origin) ? origin : "";
}
