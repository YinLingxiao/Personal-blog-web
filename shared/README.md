# 星空背景

`starfield.js` 是主页、博客和视频下载页的共用 Canvas 动效源。星点分布、密度、颜色、柔光、闪烁、30 fps 上限、减少动态效果和页面隐藏暂停均由此维护。

修改后在工作区根目录执行 `node scripts/sync-starfield.mjs`，将代码同步至 `New/app/src/lib/`、`Blog/src/lib/` 和 `video-downloader/static/js/`。主页和博客的 dev/build 命令会自动同步；各站点部署后独立运行，不跨站请求此模块。

执行 `node scripts/sync-starfield.mjs --check` 检查三份副本一致性。不要直接修改副本。视频项目未纳入当前 Git 仓库，发布时需同步其 templates 和 static 文件。
