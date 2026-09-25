# Moqian — Personal Site Workspace

墨浅的个人网站工作区，包含主页、博客与知识笔记三套独立前端，以及它们各自的 Markdown 内容管线。

[Home](https://moqian.me/) · [Blog](https://moqian.me/blog/) · [Note](https://note.moqian.me/)

## 特性

**视觉与交互**
- 统一的深色灰阶、音乐节目单与乐谱剪影视觉语言
- GSAP + ScrollTrigger 入场动画、Lenis 平滑滚动、tsParticles 粒子背景
- ASCII 月亮 + 打字机 Hero、IDE 名言循环机、Great Vibes 花体品牌签名

**博客 (Blog)**
- 全文搜索与命令行式过滤、按分类归类、Obsidian `[[wiki link]]` 自动解析
- KaTeX 数学公式渲染、Markdown 封面图管线
- 卡片式列表布局、肖邦《叙事曲》乐谱剪影、灰阶克制动效

**知识笔记 (Note)**
- D3 知识图谱（实体节点 + 幽灵节点 + 分类桶），`[[wiki link]]` 双向解析
- Markdown + KaTeX 阅读器
- 四种程序化动态背景（Silk Cascade / Moonlit Ripple / Rain on Glass / 纯色）
- 桌面端跳脉络图 `/graph`，移动端自动进入最新笔记

**内容体系**
- Obsidian page bundle：`index.md` + 同目录配图，`./xxx` 相对路径引用
- Blog 内容源 `Opus/posts/`，Note 内容源 `Notes/`，两边各自独立构建
- Blog 构建自动生成 `/blog/latest.json`，供 Home 运行时展示最新文章

## 项目结构

| 路径 | 用途 | 开发端口 | 说明 |
| --- | --- | --- | --- |
| `New/app/` | Home 源码（React SPA） | `8080` | 构建后拷贝 `dist/` → `Home/` |
| `Home/` | Home 当前静态部署产物 | 静态服务 | 可直接部署 |
| `Blog/` | 博客 SPA | `3000` | `base: /blog/` |
| `Note/` | 知识笔记 SPA | `3001` | `base: /`，独立域名部署 |
| `Site-api/` | 三端认证与超管内容接收 API | `8787` | Better Auth + Express + SQLite |
| `Opus/posts/` | Blog 内容源 | N/A | 本地 Markdown，不入仓库 |
| `Notes/` | Note 内容源 | N/A | 本地 Markdown，不入仓库 |

本仓库仅公开应用源码。实际文章、笔记与内部协作文档均保持在本地，由 `.gitignore` 隔离。

## 技术栈

| 模块 | 主要技术 |
| --- | --- |
| 前端核心 | React 19.2 · React Router 7.6 · Vite 7.2 · TypeScript 5.9 |
| 样式 | Tailwind CSS 3.4 · CSS 变量驱动的灰阶 design tokens |
| Home 特效 | GSAP 3.15 · Lenis 1.3 · tsParticles 4.0 · shadcn/ui primitives |
| Blog 渲染 | React Markdown 10.1 · KaTeX 0.17 · remark/rehype 管线 |
| Note 可视化 | D3 7.9 · Canvas 程序化背景 |
| 测试 | Vitest 4.1 · Blog 4 项 / Note 6 项单元测试 |
| 内容管线 | 构建期 Node.js 脚本 · page bundle 图片复制 ·路径改写 |

## 本地开发

要求 Node.js ≥ 20.19。

```powershell
git clone https://github.com/YinLingxiao/Personal-blog-web.git
cd Personal-blog-web

npm --prefix New/app install
npm --prefix Blog install
npm --prefix Note install
npm --prefix Site-api install
```

仓库不包含文章、笔记与构建产物。首次克隆后，需要在本地创建内容目录并生成数据：

```powershell
# 创建本地内容目录
mkdir -p Opus\posts\随笔\my-post
mkdir -p Notes\高等数学\my-note

# 博客 —— 在 Opus\posts\随笔\my-post\ 下创建 index.md（参考下方 Markdown 格式）
# 笔记 —— 在 Notes\高等数学\my-note\ 下创建 index.md

# 生成内容数据（构建/开发前会自动执行，也可以手动运行）
npm --prefix Blog run generate
npm --prefix Note run generate
```

分别启动三个开发服务：

```powershell
npm --prefix New/app run dev     # Home    → http://localhost:8080/
npm --prefix Blog run dev        # Blog    → http://localhost:3000/blog/
npm --prefix Note run dev        # Note    → http://localhost:3001/
npm --prefix Site-api run dev    # Auth/API → http://localhost:8787/
```

Home 开发服务会将 `/blog/*` 代理到 Blog 的 `3000` 端口。

## 内容格式

Blog 与 Note 使用相同的 page bundle 约定：

```text
<内容库>/<分类>/<slug>/
├─ index.md
├─ cover.jpg
└─ illustration.png
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

标题、日期、摘要和标签均可选；`draft: true` 会在构建时排除内容。详细规则见 [`Opus/README.md`](./Opus/README.md)。

## 构建与发布

完整质量检查（lint + typecheck + test + build）：

```powershell
npm run quality:content-sites
```

单独构建：

```powershell
npm --prefix New/app run build
npm --prefix Blog run build
npm --prefix Note run build
```

更新 Home 静态部署目录：

```powershell
Remove-Item Home/assets/* -Force
Copy-Item New/app/dist/* Home/ -Recurse -Force
```

## 部署结构

| 公开地址 | 部署内容 | 说明 |
| --- | --- | --- |
| `https://moqian.me/` | `Home/` | 静态文件 + SPA fallback |
| `https://moqian.me/blog/` | `Blog/dist/` | SPA，`/blog/` base |
| `https://note.moqian.me/` | `Note/dist/` | SPA，根路径，独立域名 |
| `https://api.moqian.me/` | `Site-api/dist/` Node 服务 | Google/GitHub OAuth、三端会话与超管上传 |

生产服务器需配置 SPA history fallback。

## 相关文档

- [`New/app/README.md`](./New/app/README.md)：Home 开发说明
- [`Blog/README.md`](./Blog/README.md)：Blog 内容管线与命令
- [`Note/README.md`](./Note/README.md)：Note 内容管线与命令
- [`Opus/README.md`](./Opus/README.md)：本地博文格式与工作流

## 许可证

[MIT](./LICENSE)
