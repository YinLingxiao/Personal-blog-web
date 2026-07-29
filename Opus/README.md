# Opus

墨浅博客的内容库。`Blog/scripts/build-notes.mjs` 在开发和构建前扫描 `posts/`，生成博客运行所需的数据与静态图片。

## 目录约定

```text
Opus/
├─ posts/
│  └─ <分类>/
│     └─ <slug>/
│        ├─ index.md
│        └─ image.jpg
├─ notes/
└─ README.md
```

- `posts/<分类>/` 的文件夹名默认成为文章分类。
- 正式文章统一使用 page bundle：`posts/<分类>/<slug>/index.md`。
- 配图与 `index.md` 放在同一个文件夹，正文使用 `./image.jpg` 引用。
- slug 来自文章文件夹名，公开地址为 `/blog/post/<slug>`。
- `notes/` 是私有笔记和草稿目录，不会被 Blog 扫描。
- 扁平 Markdown 仍兼容，但只用于临时测试。

## Frontmatter

所有字段均可选。推荐保留 `date` 和 `summary`，标题优先写在正文第一行 `# H1`。

```yaml
---
date: 2026-05-26
updated: 2026-05-27
summary: 一句话摘要
cover: ./cover.jpg
tags: [技术, AI]
aliases: [别名]
draft: false
---

# 文章标题
```

- `category` 可覆盖文件夹分类。
- `title` 可覆盖正文首个 H1。
- `draft: true` 会从构建中排除文章。
- `cover` 必须指向 page bundle 内的同级图片。
- KaTeX 全局启用，不需要 `math` 字段。
- 支持 Obsidian `[[wiki link]]`、行内数组和多行 YAML 列表。

## 图片

```text
Opus/posts/随笔/liubai/
├─ index.md
├─ cover.jpg
└─ illustration.png
```

```markdown
![一张图](./illustration.png)
```

构建时图片会复制到 `Blog/public/posts/<slug>/`，Markdown 路径会改写为 `/blog/posts/<slug>/<file>`。

## 工作流

```powershell
cd ..\Blog
npm install
npm run dev       # http://localhost:3000/blog/
npm run quality   # lint + typecheck + test + build
```

构建产物位于 `Blog/dist/`，并包含供 Home 使用的 `latest.json`。生成数据、复制后的图片和 `dist/` 均由构建命令重建，不提交到仓库。
