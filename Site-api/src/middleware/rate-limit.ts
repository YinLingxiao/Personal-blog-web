import type { NextFunction, Response } from "express";
import type { AdminRequest } from "./require-super-admin.js";

interface Bucket {
  startedAt: number;
  count: number;
}

export function createAdminRateLimit(attemptsPerHour: number) {
  const buckets = new Map<string, Bucket>();
  return (req: AdminRequest, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (buckets.size > 256) {
      for (const [bucketKey, value] of buckets) {
        if (now - value.startedAt >= 3_600_000) buckets.delete(bucketKey);
      }
      if (buckets.size > 512) {
        const oldest = [...buckets.entries()].sort((a, b) => a[1].startedAt - b[1].startedAt);
        for (const [bucketKey] of oldest.slice(0, buckets.size - 512)) buckets.delete(bucketKey);
      }
    }
    const key = req.admin?.id || "anonymous";
    const current = buckets.get(key);
    const bucket = !current || now - current.startedAt >= 3_600_000
      ? { startedAt: now, count: 0 }
      : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    if (bucket.count > attemptsPerHour) {
      res.setHeader("Retry-After", Math.ceil((bucket.startedAt + 3_600_000 - now) / 1000));
      res.status(429).json({ code: "RATE_LIMITED", message: "上传尝试过于频繁，请稍后再试" });
      return;
    }
    next();
  };
}
