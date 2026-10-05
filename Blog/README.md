# Moqian Blog

墨浅个人博客的独立前端项目，部署在 `moqian.me/blog/`。内容来自工作区同级的 `Opus/posts/`，构建时生成文章数据、图片资源与主页最新文章数据。

博文内容仓库：[YinLingxiaoBlog](https://github.com/YinLingxiao/YinLingxiaoBlog)。本地 `Opus/posts/` 是该仓库的检出目录，构建从这里读取；尚未配置自动同步。

## Commands

```bash
npm install
npm run dev
npm run build
npm run test
npm run quality
npm run preview
```

- 开发地址：`http://localhost:3000/blog/`
- 构建输出：`Blog/dist/`
- 内容目录：`Opus/posts/`（可用 `BLOG_CONTENT_ROOT` 指向服务器持久化绝对路径）

## Content pipeline

`scripts/build-notes.mjs` 在 Vite 启动和构建前运行：

- 扫描 `../Opus/posts/`；
- 生成 `src/generated/posts.json`；
- 将 page bundle 图片复制到 `public/posts/<slug>/`；
- 生成 `public/latest.json`，供主页读取 `/blog/latest.json`。

以上生成文件与 `dist/` 均不提交到仓库，`npm run generate`、`npm run dev`、`npm run check` 和 `npm run build` 会按需重建。

博客支持 Markdown、KaTeX、`[[wiki link]]`、分类筛选和全文搜索。内容规范见 `Opus/CLAUDE.md`。超管可从 `/blog/admin/upload` 保存一个新的 page bundle，API 随即发布内容，无需重新构建页面；已有 slug 不会被覆盖。

超级管理员可在 `/blog/admin/posts` 搜索已发布文章与草稿、编辑或下载完整文章包；文章页和账户菜单也提供入口。编辑器单独填写标题、摘要、标签、分类、日期、封面，Markdown 预览复用阅读页的公式、代码和双链规则。保存前展示差异，版本冲突会保留当前编辑并要求重新确认。slug 和文章链接保持不变，`date`、`updated` 仅按手动修改保存。

正文区使用 CodeMirror 6，提供行号、Markdown 语法高亮、当前行、自动换行、撤销重做、查找与 Tab 缩进（Esc 后按 Tab 可移出编辑器）。光标所在源码对应的预览内容会标记，移出可见范围时才滚动；双击预览段落可返回对应源码起点。滚动联动按实际内容块和块内位置定位，公式、双链转换及首个 H1 提取保留原始正文位置，不按整篇百分比同步。元数据标题和封面不参与源码定位。

“全屏编辑”可展开整个浏览器窗口，桌面左侧 Markdown、右侧预览；手机可切换两栏，双击预览时自动回到编辑。全屏切换复用同一个编辑器，保留正文、选区、撤销历史与源码阅读位置。预览更新按 120ms 合并，中文输入组合结束后再更新；正文立即进入待保存数据。点击“退出全屏”或按 Esc 返回后在编辑页保存并发布。

同名文件夹上传可转入“更新已有文章”：正文和配图完整替换，确认页列出图片增删与替换；网页编辑则保留未删除配图。发布失败时源文件已保存，线上仍显示旧版，可重试发布。管理页可下载当前文章包以同步本地 Obsidian，也可下载上一版 ZIP 后解压、上传恢复。网页编辑不会自动同步本地内容仓库。

本功能需同时部署新版 Site-api 与 Blog/dist；API 契约、备份目录和单实例运行要求见 [Site-api README](../Site-api/README.md)。Note 的上传与阅读流程保持原有行为。

`npm run quality` 会依次执行 ESLint、TypeScript、Vitest 和生产构建。Blog 内部使用 `Post` 数据模型，公开文章路径与 `/blog/latest.json` 契约保持稳定。
