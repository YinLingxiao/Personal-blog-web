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

博客与笔记页面运行时从 `/api/content/blog/index.json`、`/api/content/note/index.json` 读取内容；首页从对应的 `latest.json` 读取最近内容。配图与 RSS 也由这些公开 API 提供。日常上传无需再次执行 Vite 构建，也无需复制 `dist`。页面代码或样式修改仍需构建并部署一次。

首次上线这套流程时，应一起部署新版 Home、Blog、Note 页面和 Site API，并重启 API 服务。部署的仓库必须保留 `Blog/scripts/build-notes.mjs` 与 `Note/scripts/build-notes.mjs`，供 API 在低权限账户下执行。该账户需要读取上述脚本、读写两个内容根目录，并读写 `/var/lib/moqian`（现有 systemd 服务配置已允许）。`/api/content/` 由现有 `api.moqian.me` Nginx 配置转发。旧的 `/blog/rss.xml` 和 `/rss.xml` 静态地址不会继续更新；新版页面链接到 API 的 RSS 地址。

生产环境应以专用低权限账户运行 API。SQLite（含在线 WAL 备份）和两个内容根目录都需要纳入备份。笔记快照中的 `identifiers.json` 记录源文件与公开网址的对应关系，发布时沿用上一份记录，兼容新增同名文件、草稿及服务重启。应同时备份 `/var/lib/moqian/published`（或自定义的 `PUBLISHED_CONTENT_ROOT`）；其他索引与图片可以重建，但遗失标识记录可能改变旧网址。

首页 Étude 区读取 `GET /api/content/note/catalog.json`。接口从当前 Note 发布快照整理完整分类与轻量笔记目录，返回 `{ total, categories, items }`；`items` 包含 `id、title、kind、category、tags、updatedAt`，不返回正文。首页构建时的备用目录使用同一份 `shared/content/note-catalog.mjs`。

## 留言簿

首页 `#guestbook` 调用：

- `GET /api/guestbook?cursor=&limit=20`：公开，游标按 `created_at + id` 从新到旧
- `POST /api/guestbook`：已登录用户，JSON `{ "body": "..." }`，首尾空白后按 Unicode 码位计 1–500
- `DELETE /api/guestbook/:id`：作者或超管

写入前先 `GET /api/session/csrf?action=guestbook-create` 或 `guestbook-delete`，并带上 `X-CSRF-Token` 与可信 `Origin`。这个入口对所有登录用户开放。`/api/admin/csrf` 仍只允许超管。留言按账户限流：每分钟 5 条、每小时 30 条，软删除不恢复额度。公开响应只有昵称、头像、是否站主和 `canDelete`。
