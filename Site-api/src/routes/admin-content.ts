import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { RuntimeConfig } from "../config.js";
import { ContentStore, type ContentTarget, type UploadManifest } from "../content/content-store.js";
import { ContentValidationError } from "../content/policy.js";
import type { AdminRequest } from "../middleware/require-super-admin.js";
import { createCsrfToken, verifyCsrfToken } from "../security/csrf.js";

function originFor(req: Request, config: RuntimeConfig) {
  const origin = req.get("origin") || "";
  return config.trustedOrigins.includes(origin) ? origin : "";
}

function parseManifest(value: FormDataEntryValue | null) {
  if (typeof value !== "string") throw new ContentValidationError("缺少上传清单");
  try {
    const manifest = JSON.parse(value) as UploadManifest;
    if (
      !manifest ||
      typeof manifest.slug !== "string" ||
      !Array.isArray(manifest.files) ||
      manifest.files.some((entry) =>
        !entry || typeof entry !== "object" || typeof entry.partId !== "string" || typeof entry.relativePath !== "string"
      )
    ) throw new Error();
    return manifest;
  } catch {
    throw new ContentValidationError("上传清单格式错误");
  }
}

export function createAdminContentRouter(
  config: RuntimeConfig,
  store: ContentStore,
  requireSuperAdmin: (req: AdminRequest, res: Response, next: NextFunction) => void,
  rateLimit: (req: AdminRequest, res: Response, next: NextFunction) => void,
) {
  const router = Router();
  const activeUploads = new Set<string>();
  router.use(requireSuperAdmin);

  router.get("/csrf", (req: AdminRequest, res) => {
    const origin = originFor(req, config);
    if (!origin) {
      res.status(403).json({ code: "INVALID_ORIGIN", message: "请求来源不受信任" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({
      token: createCsrfToken(config, { userId: req.admin!.id, origin, action: "content-upload" }),
      expiresIn: config.upload.csrfTtlSeconds,
    });
  });

  router.post("/content/:target", rateLimit, async (req: AdminRequest, res, next) => {
    const target = req.params.target as ContentTarget;
    if (target !== "blog" && target !== "note") {
      res.status(404).json({ code: "UNKNOWN_TARGET", message: "未知内容目标" });
      return;
    }
    const origin = originFor(req, config);
    const token = req.get("x-csrf-token") || "";
    if (!origin || !verifyCsrfToken(config, token, { userId: req.admin!.id, origin, action: "content-upload" })) {
      res.status(403).json({ code: "INVALID_CSRF", message: "请求校验失败，请刷新后重试" });
      return;
    }

    const userId = req.admin!.id;
    if (activeUploads.has(userId)) {
      res.status(409).json({ code: "UPLOAD_IN_PROGRESS", message: "已有上传正在处理，请等待完成" });
      return;
    }
    activeUploads.add(userId);

    try {
      const contentType = req.get("content-type") || "";
      if (!/^multipart\/form-data\s*;/i.test(contentType)) {
        throw new ContentValidationError("上传请求必须使用 multipart/form-data", 415, "UNSUPPORTED_MEDIA_TYPE");
      }
      const maximumRequestBytes = config.upload.maxTotalBytes + 1024 * 1024;
      const contentLength = Number(req.get("content-length") || 0);
      if (contentLength > maximumRequestBytes) {
        throw new ContentValidationError("上传总大小超过限制", 413, "UPLOAD_TOO_LARGE");
      }

      let receivedBytes = 0;
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          req.on("data", (chunk: Buffer) => {
            receivedBytes += chunk.length;
            if (receivedBytes > maximumRequestBytes) {
              controller.error(new ContentValidationError("上传总大小超过限制", 413, "UPLOAD_TOO_LARGE"));
              return;
            }
            controller.enqueue(chunk);
          });
          req.on("end", () => controller.close());
          req.on("error", (error) => controller.error(error));
          req.on("aborted", () => controller.error(new ContentValidationError("上传连接已中断")));
        },
      });
      const request = new Request(`${config.authUrl}${req.originalUrl}`, {
        method: "POST",
        headers: req.headers as HeadersInit,
        body: stream,
        duplex: "half",
      } as RequestInit & { duplex: "half" });
      let form: FormData;
      try {
        form = await request.formData();
      } catch (error) {
        if (error instanceof ContentValidationError) throw error;
        throw new ContentValidationError("multipart 请求格式错误");
      }
      const category = form.get("category");
      if (typeof category !== "string") throw new ContentValidationError("缺少分类");
      const manifest = parseManifest(form.get("manifest"));
      const expectedFields = new Set(["category", "manifest", ...manifest.files.map(({ partId }) => partId)]);
      for (const key of form.keys()) {
        if (!expectedFields.has(key)) throw new ContentValidationError(`上传包含清单之外的字段：${key}`);
      }
      for (const field of expectedFields) {
        if (form.getAll(field).length !== 1) throw new ContentValidationError(`上传字段必须且只能出现一次：${field}`);
      }
      if ([...form.keys()].length > config.upload.maxFiles + 2) {
        throw new ContentValidationError("上传字段数量超过限制", 413, "UPLOAD_TOO_LARGE");
      }
      const parts = manifest.files.map(({ partId }) => {
        const file = form.get(partId);
        if (!(file instanceof File)) throw new ContentValidationError(`缺少文件 part：${partId}`);
        return { partId, file };
      });
      const result = await store.store({
        target,
        category,
        manifest,
        parts,
        userId: req.admin!.id,
        requestId: req.get("x-request-id") || crypto.randomUUID(),
      });
      res.status(201).json({
        ...result,
        stored: true,
        buildTriggered: false,
        message: "源文件已保存，但尚未公开；请手动构建并部署对应站点。",
      });
    } catch (error) {
      if (error instanceof ContentValidationError) {
        res.status(error.status).json({ code: error.code, message: error.message });
        return;
      }
      next(error);
    } finally {
      activeUploads.delete(userId);
    }
  });

  return router;
}
