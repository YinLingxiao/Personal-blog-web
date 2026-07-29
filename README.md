# Personal Blog Web

墨浅的个人网站工作区，包含主页、博客与知识笔记三套独立前端，以及它们各自的 Markdown 内容管线。

- Home: [moqian.me](https://moqian.me/)
- Blog: [moqian.me/blog](https://moqian.me/blog/)
- Note: [note.moqian.me](https://note.moqian.me/)

## 特性

- React 19 + Vite 7 + TypeScript
- 统一的深色灰阶、音乐节目单与乐谱剪影视觉语言
- Blog 支持全文搜索、分类、Markdown、KaTeX 与 `[[wiki link]]`
- Note 支持独立内容库、D3 知识图谱、幽灵节点与程序化背景
- Obsidian 友好的 page bundle 内容格式
- Blog 构建生成 `/blog/latest.json`，供 Home 运行时展示最新文章
- Home、Blog、Note 独立开发、构建和部署

## 项目结构

| 路径 | 用途 | 开发端口 | 构建输出 |
| --- | --- | --- | --- |
| `New/app/` | Home 源码 | `8080` | `New/app/dist/` |
| `Home/` | Home 当前静态部署产物 | 静态服务 | `Home/` |
| `Blog/` | 博客 SPA | `3000` | `Blog/dist/` |
| `Note/` | 知识笔记 SPA | `3001` | `Note/dist/` |
| `Opus/posts/` | Blog 内容源 | N/A | 由 Blog 构建读取 |
| `Notes/` | Note 内容源 | N/A | 由 Note 构建读取 |

本仓库只公开应用源码和各目录的 `README.md`。实际文章、笔记、内部协作文档、本机 Agent 配置与外部伴生工具均由根 `.gitignore` 隔离，不进入 GitHub。

## 技术栈

| 模块 | 主要技术 |
| --- | --- |
| Home | React、Vite、TypeScript、GSAP、Lenis、tsParticles、Tailwind CSS |
| Blog | React Router、React Markdown、KaTeX、Vitest |
| Note | React Router、React Markdown、KaTeX、D3、Vitest |
| Content | Markdown、Obsidian page bundle、构建期 Node.js 脚本 |

## 本地开发

需要 Node.js 20.19+ 与 npm。

```powershell
git clone https://github.com/YinLingxiao/Personal-blog-web.git
cd Personal-blog-web

npm --prefix New/app install
npm --prefix Blog install
npm --prefix Note install
```

分别启动三个开发服务：

```powershell
npm --prefix New/app run dev
npm --prefix Blog run dev
npm --prefix Note run dev
```

访问地址：

| 站点 | 地址 |
| --- | --- |
| Home | `http://localhost:8080/` |
| Blog | `http://localhost:3000/blog/` |
| Note | `http://localhost:3001/` |

Home 开发服务会将 `/blog/*` 代理到 Blog 的 `3000` 端口。

## 内容格式

Blog 与 Note 使用相同的 page bundle 约定：

```text
<内容库>/<分类>/<slug>/
├─ index.md
├─ cover.jpg
└─ illustration.png
```

Blog 示例路径：

```text
Opus/posts/技术/my-post/index.md
```

Note 示例路径：

```text
Notes/高等数学/my-note/index.md
```

推荐的 Markdown 格式：

```markdown
---
date: 2026-07-29
updated: 2026-07-30
summary: 一句话摘要
cover: ./cover.jpg
tags: [React, Vite]
aliases: [别名]
draft: false
---

# 标题

正文中的图片使用 `./illustration.png` 引用。
```

标题、日期、摘要和标签均可选；`draft: true` 会在构建时排除内容。公开仓库不包含实际文章与笔记，克隆后可按以上结构在本地内容目录中添加。详细规则见 [`Opus/README.md`](./Opus/README.md)。

## 构建与检查

完整检查 Blog 与 Note：

```powershell
npm run quality:content-sites
```

该命令依次运行 ESLint、TypeScript、Vitest 和生产构建。

分别构建：

```powershell
npm --prefix New/app run build
npm --prefix Blog run build
npm --prefix Note run build
```

Blog 和 Note 会在检查或构建前自动执行内容生成：

- Blog 生成 `src/generated/posts.json`、`public/posts/` 与 `public/latest.json`
- Note 生成 `src/generated/notes.json` 与按需复制的 `public/posts/`
- 生成数据、复制资源和 `dist/` 均不提交到 Git

更新 `Home/` 静态部署目录：

```powershell
Remove-Item Home/assets/* -Force
Copy-Item New/app/dist/* Home/ -Recurse -Force
```

## 部署结构

| 公开地址 | 部署内容 |
| --- | --- |
| `https://moqian.me/` | `Home/` |
| `https://moqian.me/blog/` | `Blog/dist/` |
| `https://note.moqian.me/` | `Note/dist/` |

Blog 与 Note 都是 SPA，生产服务器需要配置 history fallback，并分别将构建输出发布到对应路径。

## 质量基线

- Blog：4 项单元测试
- Note：6 项单元测试
- Home、Blog、Note 生产构建通过后再发布
- Blog 与 Note 的源码、内容库、生成目录和部署产物保持独立

## Roadmap

- Google / GitHub OAuth 登录
- Home、Blog、Note 三端共享会话
- `super_admin` 服务端权限控制
- Blog 与 Note 的 Markdown 上传、预览、构建和原子发布

## 相关文档

- [`New/app/README.md`](./New/app/README.md)：Home 开发说明
- [`Blog/README.md`](./Blog/README.md)：Blog 内容管线与命令
- [`Note/README.md`](./Note/README.md)：Note 内容管线与命令
- [`Opus/README.md`](./Opus/README.md)：本地博文格式与工作流
