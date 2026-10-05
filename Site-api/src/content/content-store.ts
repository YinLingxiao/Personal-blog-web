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
import { bundleZip, describeBundle, hiddenDirectory, locateBlog, markdownMetadata, readBundle, safeDirectory, scanBlog } from "./blog-bundles.js";

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
  revision?: string;
}

function frontmatterCategory(markdown: string, target: ContentTarget) {
  if (target === "blog") return String(markdownMetadata(markdown).category || "").trim().normalize("NFC");
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

  listBlog() {
    return scanBlog(this.config.blogContentRoot).map((entry) => {
      const { markdown: _markdown, files: _files, metadata: _metadata, ...item } = describeBundle(entry);
      const lastEdit = this.database.prepare("SELECT e.publish_status FROM content_edit_audit e JOIN content_upload_audit u ON u.id = e.upload_id WHERE u.slug = ? AND e.new_revision = ? ORDER BY u.created_at DESC LIMIT 1").get(item.slug, item.revision) as { publish_status: string } | undefined;
      return { ...item, publishFailed: lastEdit?.publish_status === "failed", hasBackup: fs.existsSync(path.join(this.config.blogContentRoot, ".content-backups", item.slug)) };
    });
  }

  readBlog(slug: string) {
    return describeBundle(locateBlog(this.config.blogContentRoot, slug));
  }

  blogZip(slug: string, backup = false) {
    const entry = locateBlog(this.config.blogContentRoot, slug);
    if (!backup) return bundleZip(slug, entry.source, entry.flat);
    const root = hiddenDirectory(ensureSafeRoot(this.config.blogContentRoot), ".content-backups");
    const source = path.join(root, slug);
    if (!fs.existsSync(source)) throw new ContentValidationError("尚无上一版备份", 404, "BACKUP_NOT_FOUND");
    return bundleZip(slug, source);
  }

  blogImage(slug: string, filename: string) {
    validateSegment(filename, "filename");
    if (classifyFile(filename) !== "image") throw new ContentValidationError("只能读取配图");
    const entry = locateBlog(this.config.blogContentRoot, slug);
    if (entry.flat) throw new ContentValidationError("配图不存在", 404, "CONTENT_NOT_FOUND");
    safeDirectory(entry.source);
    const full = path.join(entry.source, filename);
    if (!fs.existsSync(full)) throw new ContentValidationError("配图不存在", 404, "CONTENT_NOT_FOUND");
    const stat = fs.lstatSync(full);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new ContentValidationError("配图不是普通文件");
    return fs.readFileSync(full);
  }

  private replaceBlog(staging: string, destination: string, slug: string, auditId: string) {
    const root = ensureSafeRoot(this.config.blogContentRoot);
    const original = locateBlog(root, slug);
    const transactions = hiddenDirectory(root, ".content-transactions");
    const backups = hiddenDirectory(root, ".content-backups");
    const backup = path.join(backups, slug);
    if (fs.existsSync(backup)) readBundle(backup);
    const transaction = fs.mkdtempSync(path.join(transactions, "update-"));
    const old = path.join(transaction, "original");
    const candidateBackup = path.join(transaction, "backup");
    fs.mkdirSync(candidateBackup);
    for (const [name, buffer] of readBundle(original.source, original.flat)) fs.writeFileSync(path.join(candidateBackup, name), buffer);
    fs.writeFileSync(path.join(transaction, "journal.json"), JSON.stringify({
      source: path.relative(root, original.source), destination: path.relative(root, destination), slug, auditId,
    }));
    try {
      fs.renameSync(original.source, old);
      fs.renameSync(staging, destination);
      if (fs.existsSync(backup)) fs.renameSync(backup, path.join(transaction, "previous-backup"));
      fs.renameSync(candidateBackup, backup);
      this.database.prepare("UPDATE content_upload_audit SET status = 'stored' WHERE id = ?").run(auditId);
    } catch (error) {
      this.recoverTransaction(root, transaction);
      throw error;
    }
    try { fs.rmSync(transaction, { recursive: true, force: true }); }
    catch (error) { console.error("[site-api] committed update cleanup deferred", error); }
  }

  private recoverTransaction(root: string, transaction: string) {
    safeDirectory(transaction);
    const journal = path.join(transaction, "journal.json");
    if (!fs.existsSync(journal)) { fs.rmSync(transaction, { recursive: true, force: true }); return; }
    const data = JSON.parse(fs.readFileSync(journal, "utf8")) as { source: string; destination: string; slug: string; auditId: string };
    validateSegment(data.slug, "category");
    const paths = [data.source, data.destination].map((relative) => {
      const parts = relative.split(path.sep);
      if (parts.length < 1 || parts.length > 2) throw new ContentValidationError("恢复路径不安全");
      parts.forEach((part) => validateSegment(part, "category"));
      const full = path.resolve(root, relative);
      if (!full.startsWith(root + path.sep)) throw new ContentValidationError("恢复路径越界");
      safeDirectory(path.dirname(full));
      return full;
    });
    const audit = this.database.prepare("SELECT status FROM content_upload_audit WHERE id = ?").get(data.auditId) as { status: string } | undefined;
    if (audit?.status !== "stored") {
      const old = path.join(transaction, "original");
      if (fs.existsSync(old)) {
        if (fs.existsSync(paths[1])) fs.rmSync(paths[1], { recursive: true, force: true });
        fs.renameSync(old, paths[0]);
      }
      const previous = path.join(transaction, "previous-backup");
      const backup = path.join(hiddenDirectory(root, ".content-backups"), data.slug);
      if (fs.existsSync(previous)) {
        if (fs.existsSync(backup)) { safeDirectory(backup); fs.rmSync(backup, { recursive: true }); }
        fs.renameSync(previous, backup);
      } else if (!fs.existsSync(path.join(transaction, "backup")) && fs.existsSync(backup)) {
        safeDirectory(backup); fs.rmSync(backup, { recursive: true });
      }
      this.database.prepare("UPDATE content_upload_audit SET status = 'rolled-back' WHERE id = ?").run(data.auditId);
    }
    fs.rmSync(transaction, { recursive: true, force: true });
  }

  recordPublication(auditId: string, published: boolean) {
    this.recordPublishStatus(auditId, published ? "published" : "draft");
  }

  recordPublishFailure(auditId: string) {
    this.recordPublishStatus(auditId, "failed");
  }

  private recordPublishStatus(auditId: string, status: string) {
    try { this.database.prepare("UPDATE content_edit_audit SET publish_status = ? WHERE upload_id = ?").run(status, auditId); }
    catch (error) { console.error("[site-api] failed to finalize publication audit", error); }
  }

  recordPublishRetry(slug: string, published: boolean) {
    const source = this.readBlog(slug);
    try {
      this.database.prepare("UPDATE content_edit_audit SET publish_status = ? WHERE upload_id = (SELECT e.upload_id FROM content_edit_audit e JOIN content_upload_audit u ON u.id = e.upload_id WHERE u.slug = ? AND u.target = 'blog' AND e.new_revision = ? ORDER BY u.created_at DESC LIMIT 1)").run(published ? "published" : "draft", slug, source.revision);
    } catch (error) { console.error("[site-api] failed to finalize publication retry audit", error); }
  }

  async store(input: StoreInput) {
    const category = validateSegment(input.category, "category");
    const slug = validateSegment(input.manifest.slug, input.revision === undefined ? "slug" : "category");
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
    const updating = input.revision !== undefined;
    if (updating && input.target !== "blog") throw new ContentValidationError("仅博客支持更新");
    if (!updating && slugExists(root, slug)) throw new ContentValidationError("slug 已存在，不能覆盖", 409, "SLUG_EXISTS");
    if (updating && this.readBlog(slug).revision !== input.revision) throw new ContentValidationError("文章已被修改，请对比最新版本后重新确认", 409, "REVISION_CONFLICT");
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
          const declaredCategory = frontmatterCategory(text, input.target);
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

      if (!updating && slugExists(root, slug)) throw new ContentValidationError("slug 已存在，不能覆盖", 409, "SLUG_EXISTS");
      if (updating && this.readBlog(slug).revision !== input.revision) throw new ContentValidationError("文章已被修改，请对比最新版本后重新确认", 409, "REVISION_CONFLICT");
      const categoryPath = ensureSafeCategory(root, category);
      const destination = path.join(categoryPath, slug);
      if (fs.existsSync(destination) && (!updating || locateBlog(root, slug).source !== destination)) throw new ContentValidationError("目标目录已存在", 409, "SLUG_EXISTS");

      this.database.prepare(`
        INSERT INTO content_upload_audit
          (id, user_id, target, category, slug, file_count, byte_count, status, request_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(auditId, input.userId, input.target, category, slug, filenames.length, totalBytes, input.requestId, Date.now());

      fs.chmodSync(staging, 0o755);
      if (updating) {
        const newRevision = describeBundle({ slug, category: path.basename(categoryPath), source: staging, flat: false }).revision;
        this.database.prepare("INSERT INTO content_edit_audit (upload_id, previous_revision, new_revision, publish_status) VALUES (?, ?, ?, 'pending')").run(auditId, input.revision, newRevision);
        this.replaceBlog(staging, destination, slug, auditId);
      } else fs.renameSync(staging, destination);
      try {
        this.database.prepare("UPDATE content_upload_audit SET status = 'stored' WHERE id = ?").run(auditId);
      } catch (error) {
        console.error("[site-api] failed to finalize content upload audit", error);
      }

      return { target: input.target, category, slug, fileCount: filenames.length, byteCount: totalBytes, ...(updating ? { auditId, revision: this.readBlog(slug).revision } : {}) };
    } finally {
      fs.rmSync(staging, { recursive: true, force: true });
      fs.rmSync(lockPath, { recursive: true, force: true });
    }
  }

  cleanupStaging(maxAgeMs = 24 * 60 * 60 * 1000) {
    for (const target of ["blog", "note"] as const) {
      const root = ensureSafeRoot(this.root(target));
      if (target === "blog") {
        const transactions = path.join(root, ".content-transactions");
        if (fs.existsSync(transactions)) {
          safeDirectory(transactions);
          for (const entry of fs.readdirSync(transactions)) {
            if (/^update-[A-Za-z0-9]+$/.test(entry)) this.recoverTransaction(root, path.join(transactions, entry));
          }
        }
      }
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
