# 墨浅首页

React、Vite 与 TypeScript 源码位于本目录。`npm run build` 生成 `dist/`，经核对后同步至仓库根目录的 `Home/`。

## 首页结构

序幕之后依次为 01 Ballade、02 Opus、03 Étude、04 About、05 Guestbook。About 默认显示原 WHO I AM 内容；右上方的两个标签切换 WHO I AM 与 ABOUT。旧 `#now` 锚点仍落在合并区并显示 WHO I AM。

首屏 WebGL 动画按星河、月相、星月成印三段运行。鼠标在画面内滚动时，一次手势切换一段；画面外保持页面滚动。聚焦画面后可使用方向键，触屏可使用横向手势；低动态设置或 WebGL 不可用时使用静态素材。About 双标签通过横向滑动切换两个面板，低动态模式直接切换。

Étude 从 `GET /api/content/note/catalog.json` 读取 Note 的完整已发布目录；接口不可用时使用构建生成的 `public/notes-catalog.json`，并显示备用数据提示。两者通过 `shared/content/note-catalog.mjs` 生成相同结构。左侧分类、星图与右侧笔记列表联动，列表超出七篇时独立滚动。`notes-latest.json` 保留供旧页面兼容。

乐谱剪影使用 `public/scores/` 下的透明 WebP 图层，来源和节选见 [SOURCES.md](public/scores/SOURCES.md)。

## 本地命令

```bash
npm run dev
npm run lint
npm run test:motion
npm run build
```

本地 API 默认运行在 `http://localhost:8787`，Note 在 `http://localhost:3001`。未启动 API 时，笔记区会使用本地快照。
