# Site API

Home、Blog 与 Note 共用的身份服务，基于 Better Auth、Express 与 SQLite。

## Setup

```powershell
Copy-Item .env.example .env
npm install
npm run dev
```

开发地址为 `http://localhost:8787`。首次启动会自动创建 `data/auth.sqlite` 和 Better Auth 所需表结构。

Google OAuth 回调地址：

```text
http://localhost:8787/api/auth/callback/google
https://api.moqian.me/api/auth/callback/google
```

GitHub OAuth 回调地址：

```text
http://localhost:8787/api/auth/callback/github
https://api.moqian.me/api/auth/callback/github
```

生产环境必须设置高熵 `BETTER_AUTH_SECRET`，将 `BETTER_AUTH_URL` 设为 `https://api.moqian.me`，并为 `BLOG_CONTENT_ROOT` 与 `NOTE_CONTENT_ROOT` 设置持久化的绝对路径。发布索引默认写在 `/var/lib/moqian/published`，也可用 `PUBLISHED_CONTENT_ROOT` 指定其他独立目录。会话 Cookie 只属于 `api.moqian.me`，三端通过 credentialed API 请求共享登录状态。

## 超管授权

先让目标账户完成一次 Google 或 GitHub 登录，再在服务器执行：

```powershell
npm run admin:grant -- --email admin@example.com
# 或 npm run admin:grant -- --id <user-id>
```

CLI 只允许存在一位超管；没有公开升权接口。

## 内容上传

Blog 与 Note 的超管上传页分别调用：

- `POST /api/admin/content/blog`
- `POST /api/admin/content/note`

上传文件夹必须是 `<slug>/index.md` 加同级图片，slug 仅允许小写字母、数字和单连字符；已有 slug 不会被覆盖。API 保存源文件后自动生成博客或笔记的内容索引、配图、首页摘要和 RSS，并切换公开版本。草稿（`draft: true`）只保存，不公开。发布失败时源文件仍保留，上传页提供“重试发布”。

## 博文编辑与更新

超级管理员可访问 `/blog/admin/posts` 管理已发布博文和草稿，或从文章页进入编辑。网页提供 Markdown 正文和预览、元数据字段及配图管理；日期不会自动改变，未知 frontmatter 字段和 aliases 保留。已有文章的 slug 固定，分类可调整。同名文件夹上传被新增接口拒绝后，可选择“更新已有文章”，对比正文、分类及图片增删，再确认发布。文件夹更新完整替换文章包，缺少的旧图片会删除；网页编辑保留未主动删除的图片。

博客专用管理接口均需超级管理员会话，响应不缓存：

- `GET /api/admin/content/blog`：已发布内容与草稿列表，包含发布失败及备份状态。
- `GET /api/admin/content/blog/:slug`：原始 Markdown、元数据、文件清单及 `revision`。
- `GET /api/admin/content/blog/:slug/images/:filename`：源文件配图，可读取尚未公开的草稿配图。
- `GET /api/admin/content/blog/:slug/download`：完整 `<slug>/index.md` 与同级配图 ZIP；`?version=previous` 下载上一版。
- `PUT /api/admin/content/blog/:slug`：multipart `category`、`manifest`、`revision` 及文件 parts；manifest 与新增上传一致。先获取 `/api/admin/csrf?action=update`，再携带 `X-CSRF-Token` 和可信 `Origin`。

`revision` 对真实分类路径、正文和图片内容计算摘要。版本冲突返回 `409 REVISION_CONFLICT`，前端保留编辑并读取最新版本重新确认；新增上传接口继续返回 `409 SLUG_EXISTS`。更新成功返回新的 `revision` 和原有保存/发布状态；发布失败返回 `202`，源文件已保存且线上保留上次成功版本，可通过现有 publish 接口重试。博客写入、源文件读取与发布在同一 API 进程内按目标串行执行；生产服务需保持单实例，外部脚本直接写内容根目录前应停服，避免绕过此队列。

每次更新把上一版完整文章包保存到内容根目录的 `.content-backups/<slug>/`，只保留一版，且不会被内容扫描或公开 API 暴露。恢复时下载上一版 ZIP，解压后重新上传，选择原分类并确认更新。`.content-transactions/` 保存目录交换日志，服务启动时恢复未提交的交换；数据库 `content_edit_audit` 关联操作者、请求、前后 revision 与发布结果。备份内容根目录时须包含这两个隐藏目录及 SQLite。图片地址包含内容摘要参数，替图后会绕过旧缓存。

首次部署此功能需更新 Site-api 和 Blog 前端并重启 API，数据库新增表自动创建；发布脚本依赖 Blog 的 `yaml` 包及 `shared/content/display-math.mjs`，部署时一起保留并安装 Blog、Site-api 的依赖。同时更新 `deploy/nginx-api.moqian.me.conf`，执行 `nginx -t` 后重载：管理员读取与写入分开限流，读取允许多配图并行加载，写入保留每分钟 10 次与 burst=5，发布等待超时调整为 150 秒。模板中的 map 和 limit_req_zone 应在 http 上下文中各定义一次；清理旧的 api_admin 限流引用。此后的博文修改无需重建前端。

博客与笔记页面运行时从 `/api/content/blog/index.json`、`/api/content/note/index.json` 读取内容；首页从对应的 `latest.json` 读取最近内容。配图与 RSS 也由这些 API 提供。笔记正文 `note/index.json` 与笔记配图 `note/posts/*` 需登录（任意已登录账户，匿名返回 401），笔记站对匿名访客显示登录提示；笔记的 `catalog.json`、`latest.json`、`rss.xml` 与博客全部内容仍公开。日常上传无需再次执行 Vite 构建，也无需复制 `dist`。页面代码或样式修改仍需构建并部署一次。

首次上线这套流程时，应一起部署新版 Home、Blog、Note 页面和 Site API，并重启 API 服务。部署的仓库必须保留 `Blog/scripts/build-notes.mjs` 与 `Note/scripts/build-notes.mjs`，供 API 在低权限账户下执行。该账户需要读取上述脚本、读写两个内容根目录，并读写 `/var/lib/moqian`（现有 systemd 服务配置已允许）。`/api/content/` 由现有 `api.moqian.me` Nginx 配置转发。旧的 `/blog/rss.xml` 和 `/rss.xml` 静态地址不会继续更新；新版页面链接到 API 的 RSS 地址。

生产环境应以专用低权限账户运行 API。SQLite（含在线 WAL 备份）和两个内容根目录都需要纳入备份。笔记快照中的 `identifiers.json` 记录源文件与公开网址的对应关系，发布时沿用上一份记录，兼容新增同名文件、草稿及服务重启。应同时备份 `/var/lib/moqian/published`（或自定义的 `PUBLISHED_CONTENT_ROOT`）；其他索引与图片可以重建，但遗失标识记录可能改变旧网址。

首页 Étude 区读取 `GET /api/content/note/catalog.json`。接口从当前 Note 发布快照整理完整分类与轻量笔记目录，返回 `{ total, categories, items }`；`items` 包含 `id、title、kind、category、tags、updatedAt`，不返回正文。首页构建时的备用目录使用同一份 `shared/content/note-catalog.mjs`。

## 留言簿

首页 `#guestbook` 调用：

- `GET /api/guestbook?cursor=&limit=20`：公开，游标按 `created_at + id` 从新到旧
- `POST /api/guestbook`：已登录用户，JSON `{ "body": "..." }`，首尾空白后按 Unicode 码位计 1–500
- `DELETE /api/guestbook/:id`：作者或超管

写入前先 `GET /api/session/csrf?action=guestbook-create` 或 `guestbook-delete`，并带上 `X-CSRF-Token` 与可信 `Origin`。这个入口对所有登录用户开放。`/api/admin/csrf` 仍只允许超管。留言按账户限流：每分钟 5 条、每小时 30 条，软删除不恢复额度。公开响应只有昵称、头像、是否站主和 `canDelete`。
