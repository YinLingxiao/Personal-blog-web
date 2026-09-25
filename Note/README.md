# Moqian Note

墨浅笔记站的独立前端项目，部署在 `note.moqian.me` 根路径。内容来自工作区同级的 `Notes/`，构建时生成站内数据与图片资源。

## Commands

```bash
npm install
npm run dev
npm run build
npm run test
npm run quality
npm run preview
```

- 开发地址：`http://localhost:3001/`
- 构建输出：`Note/dist/`
- 内容目录：`Notes/`（可用 `NOTE_CONTENT_ROOT` 指向服务器持久化绝对路径）

## Content pipeline

`scripts/build-notes.mjs` 在 Vite 启动和构建前运行：

- 扫描 `../Notes/`；
- 生成 `src/generated/notes.json`；
- 将 page bundle 图片复制到 `public/posts/<slug>/`；
- 不生成博客使用的 `latest.json`。

生成数据、复制后的图片与 `dist/` 均不提交到仓库，`npm run generate`、`npm run dev`、`npm run check` 和 `npm run build` 会按需重建。

笔记支持 Markdown、KaTeX、`[[wiki link]]`、分类图谱和四种背景。内容规范见 `Notes/CLAUDE.md`。超管可从 `/admin/upload` 保存一个新的 page bundle；该操作只写入源目录，不覆盖同 slug 内容，也不自动构建或部署。

`npm run quality` 会依次执行 ESLint、TypeScript、Vitest 和生产构建。Note 保持独立的 `Note` 模型、依赖和生成数据，不引用 Blog 源码。
