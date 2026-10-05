import crypto from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import type { RuntimeConfig } from "../config.js";
import { ContentStore, type ContentTarget, type UploadManifest } from "../content/content-store.js";
import { ContentPublisher } from "../content/content-publisher.js";
import { ContentValidationError, validateSegment } from "../content/policy.js";
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
  publisher: ContentPublisher,
  requireSuperAdmin: (req: AdminRequest, res: Response, next: NextFunction) => void,
  rateLimit: (req: AdminRequest, res: Response, next: NextFunction) => void,
) {
  const router = Router();
  const activeUploads = new Set<string>();
  router.use(requireSuperAdmin);
  router.use((_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });

  router.get("/csrf", (req: AdminRequest, res) => {
    const origin = originFor(req, config);
    if (!origin) {
      res.status(403).json({ code: "INVALID_ORIGIN", message: "请求来源不受信任" });
      return;
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({
      token: createCsrfToken(config, { userId: req.admin!.id, origin, action: req.query.action === "publish" ? "content-publish" : req.query.action === "update" ? "content-update" : "content-upload" }),
      expiresIn: config.upload.csrfTtlSeconds,
    });
  });

  const saveContent = async (req: AdminRequest, res: Response, next: NextFunction) => {
    const updating = req.method === "PUT";
    const target = req.params.target as ContentTarget;
    if (target !== "blog" && target !== "note") {
      res.status(404).json({ code: "UNKNOWN_TARGET", message: "未知内容目标" });
      return;
    }
    const origin = originFor(req, config);
    const token = req.get("x-csrf-token") || "";
    if (!origin || !verifyCsrfToken(config, token, { userId: req.admin!.id, origin, action: updating ? "content-update" : "content-upload" })) {
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
      const revision = updating ? form.get("revision") : undefined;
      if (updating && (target !== "blog" || manifest.slug !== req.params.slug || typeof revision !== "string" || !/^[a-f0-9]{64}$/.test(revision))) {
        throw new ContentValidationError("更新目标或版本无效");
      }
      const expectedFields = new Set(["category", "manifest", ...(updating ? ["revision"] : []), ...manifest.files.map(({ partId }) => partId)]);
      for (const key of form.keys()) {
        if (!expectedFields.has(key)) throw new ContentValidationError(`上传包含清单之外的字段：${key}`);
      }
      for (const field of expectedFields) {
        if (form.getAll(field).length !== 1) throw new ContentValidationError(`上传字段必须且只能出现一次：${field}`);
      }
      if ([...form.keys()].length > config.upload.maxFiles + (updating ? 3 : 2)) {
        throw new ContentValidationError("上传字段数量超过限制", 413, "UPLOAD_TOO_LARGE");
      }
      const parts = manifest.files.map(({ partId }) => {
        const file = form.get(partId);
        if (!(file instanceof File)) throw new ContentValidationError(`缺少文件 part：${partId}`);
        return { partId, file };
      });
      await publisher.exclusive(target, async () => {
        const result = await store.store({
          target,
          category,
          manifest,
          parts,
          ...(updating ? { revision: revision as string } : {}),
          userId: req.admin!.id,
          requestId: req.get("x-request-id") || crypto.randomUUID(),
        });
        try {
          const items = await publisher.publish(target);
          const publishedItem = items.find((item) => target === "note"
            ? item.sourceSlug === result.slug && item.category === result.category
            : item.id === result.slug);
          const published = Boolean(publishedItem);
          if (result.auditId) store.recordPublication(result.auditId, published);
          res.status(updating ? 200 : 201).json({
            ...result,
            stored: true,
            published,
            publishedSlug: publishedItem?.id,
            message: published ? "已保存并发布，访客现在可以看到。" : "草稿已保存，暂不公开。",
          });
        } catch (error) {
          if (result.auditId) store.recordPublishFailure(result.auditId);
          console.error("[site-api] publication failed after upload", error);
          res.status(202).json({
            ...result,
            stored: true,
            published: false,
            publishFailed: true,
            message: updating ? "修改已保存，发布失败，线上仍为旧版。请重试发布。" : "源文件已保存，但发布失败。请点击重试发布，无需重新上传。",
          });
        }
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
  };
  router.post("/content/:target", rateLimit, saveContent);
  router.put("/content/:target/:slug", rateLimit, saveContent);

  router.post("/content/:target/publish", rateLimit, async (req: AdminRequest, res) => {
    const target = req.params.target as ContentTarget;
    if (target !== "blog" && target !== "note") {
      res.status(404).json({ code: "UNKNOWN_TARGET", message: "未知内容目标" });
      return;
    }
    const origin = originFor(req, config);
    const token = req.get("x-csrf-token") || "";
    if (!origin || !verifyCsrfToken(config, token, { userId: req.admin!.id, origin, action: "content-publish" })) {
      res.status(403).json({ code: "INVALID_CSRF", message: "请求校验失败，请刷新后重试" });
      return;
    }
    const slug = req.body?.slug;
    if (typeof slug !== "string" || (target === "note" && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
      res.status(400).json({ code: "INVALID_CONTENT", message: "内容名称无效" });
      return;
    }
    try {
      await publisher.exclusive(target, async () => {
        if (target === "blog") { validateSegment(slug, "category"); store.readBlog(slug); }
        const items = await publisher.publish(target);
        const publishedItem = items.find((item) => target === "note" ? item.sourceSlug === slug : item.id === slug);
        const published = Boolean(publishedItem);
        if (target === "blog") store.recordPublishRetry(slug, published);
        res.json({ published, publishedSlug: publishedItem?.id, message: published ? "发布成功，访客现在可以看到。" : "草稿暂不公开。" });
      });
    } catch (error) {
      if (error instanceof ContentValidationError) { res.status(error.status).json({ code: error.code, message: error.message }); return; }
      console.error("[site-api] publication retry failed", error);
      res.status(503).json({ code: "PUBLICATION_FAILED", message: "发布仍未完成，请稍后重试。源文件已保存。" });
    }
  });

  router.get("/content/blog", async (_req, res, next) => {
    try {
      await publisher.exclusive("blog", async () => {
        const items = await publisher.publishedItems("blog");
        const published = new Set(items.map((item) => item.id));
        res.json(store.listBlog().map((item) => ({ ...item, published: published.has(item.slug) })));
      });
    } catch (error) { next(error); }
  });

  router.get("/content/blog/:slug", async (req, res, next) => {
    try { await publisher.exclusive("blog", async () => { res.json(store.readBlog(String(req.params.slug))); }); }
    catch (error) {
      if (error instanceof ContentValidationError) res.status(error.status).json({ code: error.code, message: error.message });
      else next(error);
    }
  });

  router.get("/content/blog/:slug/download", async (req, res, next) => {
    try {
      await publisher.exclusive("blog", async () => {
        const slug = String(req.params.slug);
        const backup = req.query.version === "previous";
        const zip = store.blogZip(slug, backup);
        res.setHeader("Content-Type", "application/zip");
        const filename = `${slug}${backup ? "-previous" : ""}.zip`;
        res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/[^A-Za-z0-9_.-]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        res.send(zip);
      });
    } catch (error) {
      if (error instanceof ContentValidationError) res.status(error.status).json({ code: error.code, message: error.message });
      else next(error);
    }
  });

  router.get("/content/blog/:slug/images/:filename", async (req, res, next) => {
    try {
      await publisher.exclusive("blog", async () => {
        const filename = String(req.params.filename);
        const buffer = store.blogImage(String(req.params.slug), filename);
        res.type(filename).send(buffer);
      });
    } catch (error) {
      if (error instanceof ContentValidationError) res.status(error.status).json({ code: error.code, message: error.message });
      else next(error);
    }
  });

  return router;
}
