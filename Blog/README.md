# Moqian Blog

墨浅个人博客的独立前端项目，部署在 `moqian.me/blog/`。内容来自工作区同级的 `Opus/posts/`，构建时生成文章数据、图片资源与主页最新文章数据。

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
- 内容目录：`Opus/posts/`

## Content pipeline

`scripts/build-notes.mjs` 在 Vite 启动和构建前运行：

- 扫描 `../Opus/posts/`；
- 生成 `src/generated/posts.json`；
- 将 page bundle 图片复制到 `public/posts/<slug>/`；
- 生成 `public/latest.json`，供主页读取 `/blog/latest.json`。

以上生成文件与 `dist/` 均不提交到仓库，`npm run generate`、`npm run dev`、`npm run check` 和 `npm run build` 会按需重建。

博客支持 Markdown、KaTeX、`[[wiki link]]`、分类筛选和全文搜索。内容规范见 `Opus/CLAUDE.md`。

`npm run quality` 会依次执行 ESLint、TypeScript、Vitest 和生产构建。Blog 内部使用 `Post` 数据模型，公开文章路径与 `/blog/latest.json` 契约保持稳定。
