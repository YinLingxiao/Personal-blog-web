import fs from "node:fs";
import path from "node:path";
import { ContentValidationError } from "./policy.js";

const META_MD = new Set(["claude.md", "readme.md"]);

function assertDirectoryNotSymlink(directory: string) {
  const stat = fs.lstatSync(directory);
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new ContentValidationError("内容目录包含符号链接或非目录节点", 400, "UNSAFE_CONTENT_ROOT");
  }
}

export function ensureSafeRoot(root: string) {
  fs.mkdirSync(root, { recursive: true });
  assertDirectoryNotSymlink(root);
  return fs.realpathSync(root);
}

export function slugExists(root: string, slug: string) {
  const realRoot = ensureSafeRoot(root);
  for (const entry of fs.readdirSync(realRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(realRoot, entry.name);
    if (entry.isSymbolicLink()) throw new ContentValidationError("内容库包含符号链接", 400, "UNSAFE_CONTENT_ROOT");
    if (entry.isFile()) {
      if (!META_MD.has(entry.name.toLowerCase()) && path.extname(entry.name).toLowerCase() === ".md" && path.basename(entry.name, path.extname(entry.name)) === slug) return true;
      continue;
    }
    if (!entry.isDirectory()) continue;
    assertDirectoryNotSymlink(full);
    if (fs.existsSync(path.join(full, "index.md")) && entry.name === slug) return true;
    for (const child of fs.readdirSync(full, { withFileTypes: true })) {
      if (child.isSymbolicLink()) throw new ContentValidationError("内容库包含符号链接", 400, "UNSAFE_CONTENT_ROOT");
      if (child.isDirectory() && child.name === slug && fs.existsSync(path.join(full, child.name, "index.md"))) return true;
      if (child.isFile() && path.extname(child.name).toLowerCase() === ".md" && path.basename(child.name, path.extname(child.name)) === slug) return true;
    }
  }
  return false;
}

export function ensureSafeCategory(root: string, category: string) {
  const realRoot = ensureSafeRoot(root);
  const categoryPath = path.join(realRoot, category);
  if (fs.existsSync(categoryPath)) {
    assertDirectoryNotSymlink(categoryPath);
    if (fs.existsSync(path.join(categoryPath, "index.md"))) {
      throw new ContentValidationError("分类名称与根级 page bundle 冲突", 409, "CATEGORY_CONFLICT");
    }
  } else fs.mkdirSync(categoryPath, { recursive: false, mode: 0o755 });
  const realCategory = fs.realpathSync(categoryPath);
  if (path.dirname(realCategory) !== realRoot) {
    throw new ContentValidationError("分类目录越出内容根目录", 400, "UNSAFE_CONTENT_ROOT");
  }
  return realCategory;
}
