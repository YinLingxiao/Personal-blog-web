import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";
import type { RuntimeConfig } from "../config.js";
import {
  assertUniqueNames,
  classifyFile,
  ContentValidationError,
  inspectImage,
  normalizeManifestPath,
  validateSegment,
} from "./policy.js";
import { ensureSafeCategory, ensureSafeRoot, slugExists } from "./scan-content.js";

export type ContentTarget = "blog" | "note";

export interface UploadManifest {
  slug: string;
  files: Array<{ partId: string; relativePath: string }>;
}

export interface UploadPart {
  partId: string;
  file: File;
}

interface StoreInput {
  target: ContentTarget;
  category: string;
  manifest: UploadManifest;
  parts: UploadPart[];
  userId: string;
  requestId: string;
}

function frontmatterCategory(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  if (!normalized.startsWith("---\n")) return "";
  const end = normalized.indexOf("\n---", 4);
  if (end < 0) return "";
  for (const line of normalized.slice(4, end).split("\n")) {
    const match = /^category\s*:\s*(.*?)\s*$/.exec(line);
    if (match) return match[1].replace(/^['"]|['"]$/g, "").trim().normalize("NFC");
  }
  return "";
}

export class ContentStore {
  constructor(
    private readonly config: RuntimeConfig,
    private readonly database: Database.Database,
  ) {}

  private root(target: ContentTarget) {
    return target === "blog" ? this.config.blogContentRoot : this.config.noteContentRoot;
  }

  async store(input: StoreInput) {
    const category = validateSegment(input.category, "category");
    const slug = validateSegment(input.manifest.slug, "slug");
    if (!Array.isArray(input.manifest.files) || input.manifest.files.length < 1 || input.manifest.files.length > this.config.upload.maxFiles) {
      throw new ContentValidationError("文件数量不合法", 413, "UPLOAD_TOO_LARGE");
    }

    const partMap = new Map(input.parts.map((part) => [part.partId, part.file]));
    if (partMap.size !== input.parts.length) throw new ContentValidationError("上传 partId 重复");
    for (const { partId } of input.manifest.files) {
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(partId)) throw new ContentValidationError("上传 partId 格式错误");
    }
    const filenames = input.manifest.files.map((entry) => normalizeManifestPath(entry.relativePath, slug));
    assertUniqueNames(filenames);
    if (filenames.filter((name) => name === "index.md").length !== 1) {
      throw new ContentValidationError("文件夹必须且只能包含一个 index.md");
    }
    if (input.manifest.files.some((entry) => !partMap.has(entry.partId)) || partMap.size !== input.manifest.files.length) {
      throw new ContentValidationError("上传清单与文件不一致");
    }

    const root = ensureSafeRoot(this.root(input.target));
    if (slugExists(root, slug)) throw new ContentValidationError("slug 已存在，不能覆盖", 409, "SLUG_EXISTS");
    const stagingRoot = path.join(root, ".upload-staging");
    if (fs.existsSync(stagingRoot)) {
      const stat = fs.lstatSync(stagingRoot);
      if (!stat.isDirectory() || stat.isSymbolicLink()) {
        throw new ContentValidationError("上传暂存目录不安全", 400, "UNSAFE_CONTENT_ROOT");
      }
    } else {
      fs.mkdirSync(stagingRoot, { recursive: false, mode: 0o700 });
    }
    const realStagingRoot = fs.realpathSync(stagingRoot);
    if (path.dirname(realStagingRoot) !== root) {
      throw new ContentValidationError("上传暂存目录越出内容根目录", 400, "UNSAFE_CONTENT_ROOT");
    }

    const lockPath = path.join(realStagingRoot, `lock-${input.target}-${slug}`);
    try {
      fs.mkdirSync(lockPath, { recursive: false, mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new ContentValidationError("同名内容正在上传", 409, "SLUG_EXISTS");
      }
      throw error;
    }

    const staging = fs.mkdtempSync(path.join(realStagingRoot, "bundle-"));
    const auditId = crypto.randomUUID();
    let totalBytes = 0;

    try {
      for (let index = 0; index < input.manifest.files.length; index += 1) {
        const entry = input.manifest.files[index];
        const filename = filenames[index];
        const file = partMap.get(entry.partId)!;
        const kind = classifyFile(filename);
        const limit = kind === "markdown" ? this.config.upload.maxMarkdownBytes : this.config.upload.maxImageBytes;
        if (file.size > limit) throw new ContentValidationError(`${filename} 超过大小限制`, 413, "UPLOAD_TOO_LARGE");
        totalBytes += file.size;
        if (totalBytes > this.config.upload.maxTotalBytes) throw new ContentValidationError("上传总大小超过限制", 413, "UPLOAD_TOO_LARGE");

        const buffer = Buffer.from(await file.arrayBuffer());
        if (kind === "markdown") {
          if (buffer.includes(0)) throw new ContentValidationError("index.md 不能包含 NUL 字节");
          const text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
          if (!text.trim()) throw new ContentValidationError("index.md 不能为空");
          const declaredCategory = frontmatterCategory(text);
          if (declaredCategory && declaredCategory !== category) {
            throw new ContentValidationError(`frontmatter 分类“${declaredCategory}”与上传分类“${category}”不一致`);
          }
        } else {
          const dimensions = inspectImage(buffer, filename);
          if (dimensions.width * dimensions.height > this.config.upload.maxImagePixels) {
            throw new ContentValidationError(`${filename} 像素尺寸超过限制`, 413, "UPLOAD_TOO_LARGE");
          }
        }
        await fs.promises.writeFile(path.join(staging, filename), buffer, { mode: 0o644, flag: "wx" });
      }

      if (slugExists(root, slug)) throw new ContentValidationError("slug 已存在，不能覆盖", 409, "SLUG_EXISTS");
      const categoryPath = ensureSafeCategory(root, category);
      const destination = path.join(categoryPath, slug);
      if (fs.existsSync(destination)) throw new ContentValidationError("目标目录已存在", 409, "SLUG_EXISTS");

      this.database.prepare(`
        INSERT INTO content_upload_audit
          (id, user_id, target, category, slug, file_count, byte_count, status, request_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(auditId, input.userId, input.target, category, slug, filenames.length, totalBytes, input.requestId, Date.now());

      fs.chmodSync(staging, 0o755);
      fs.renameSync(staging, destination);
      try {
        this.database.prepare("UPDATE content_upload_audit SET status = 'stored' WHERE id = ?").run(auditId);
      } catch (error) {
        console.error("[site-api] failed to finalize content upload audit", error);
      }

      return { target: input.target, category, slug, fileCount: filenames.length, byteCount: totalBytes };
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  }

  cleanupStaging(maxAgeMs = 24 * 60 * 60 * 1000) {
    for (const target of ["blog", "note"] as const) {
      const root = ensureSafeRoot(this.root(target));
      const stagingRoot = path.join(root, ".upload-staging");
      if (!fs.existsSync(stagingRoot)) continue;
      const stat = fs.lstatSync(stagingRoot);
      if (!stat.isDirectory() || stat.isSymbolicLink() || path.dirname(fs.realpathSync(stagingRoot)) !== root) continue;
      for (const entry of fs.readdirSync(stagingRoot, { withFileTypes: true })) {
        if (!entry.isDirectory() || (!entry.name.startsWith("bundle-") && !entry.name.startsWith("lock-"))) continue;
        const full = path.join(stagingRoot, entry.name);
        if (Date.now() - fs.lstatSync(full).mtimeMs > maxAgeMs) fs.rmSync(full, { recursive: true, force: true });
      }
    }
  }
}
