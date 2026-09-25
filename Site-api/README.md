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

生产环境必须设置高熵 `BETTER_AUTH_SECRET`，将 `BETTER_AUTH_URL` 设为 `https://api.moqian.me`，并为 `BLOG_CONTENT_ROOT` 与 `NOTE_CONTENT_ROOT` 设置持久化的绝对路径。会话 Cookie 只属于 `api.moqian.me`，三端通过 credentialed API 请求共享登录状态。

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

上传文件夹必须是 `<slug>/index.md` 加同级图片，slug 仅允许小写字母、数字和单连字符；已有 slug 不会被覆盖。API 只保存源文件，不会构建或部署。上传后手动执行：

```powershell
$env:BLOG_CONTENT_ROOT = "D:\\persistent-content\\blog"
npm --prefix Blog run build

$env:NOTE_CONTENT_ROOT = "D:\\persistent-content\\note"
npm --prefix Note run build
```

构建命令必须使用与 Site API 完全相同的 `BLOG_CONTENT_ROOT` / `NOTE_CONTENT_ROOT`，否则只会重新生成本地默认内容，刚上传的源文件不会进入产物。

生产环境应以专用低权限账户运行 API，该账户只可写 SQLite、Blog/Note 内容根目录。SQLite（含在线 WAL 备份）和两个内容根目录都需要纳入备份。
