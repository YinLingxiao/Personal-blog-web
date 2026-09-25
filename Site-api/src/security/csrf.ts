import crypto from "node:crypto";
import type { RuntimeConfig } from "../config.js";

interface CsrfPayload {
  userId: string;
  origin: string;
  action: string;
  expiresAt: number;
}

function encode(value: string) {
  return Buffer.from(value).toString("base64url");
}

export function createCsrfToken(config: RuntimeConfig, payload: Omit<CsrfPayload, "expiresAt">) {
  const complete: CsrfPayload = {
    ...payload,
    expiresAt: Date.now() + config.upload.csrfTtlSeconds * 1000,
  };
  const encoded = encode(JSON.stringify(complete));
  const signature = crypto.createHmac("sha256", config.secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyCsrfToken(
  config: RuntimeConfig,
  token: string,
  expected: Omit<CsrfPayload, "expiresAt">,
) {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  const expectedSignature = crypto.createHmac("sha256", config.secret).update(encoded).digest();
  const received = Buffer.from(signature, "base64url");
  if (received.length !== expectedSignature.length || !crypto.timingSafeEqual(received, expectedSignature)) return false;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as CsrfPayload;
    return payload.expiresAt > Date.now() && payload.userId === expected.userId && payload.origin === expected.origin && payload.action === expected.action;
  } catch {
    return false;
  }
}
