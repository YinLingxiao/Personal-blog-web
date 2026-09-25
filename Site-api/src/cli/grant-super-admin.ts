import "dotenv/config";
import { database, config } from "../runtime.js";

function fail(message: string): never {
  console.error(`[admin:grant] ${message}`);
  database.close();
  process.exit(1);
}

const args = process.argv.slice(2);
const idIndex = args.indexOf("--id");
const emailIndex = args.indexOf("--email");
const id = idIndex >= 0 ? args[idIndex + 1]?.trim() : "";
const email = emailIndex >= 0 ? args[emailIndex + 1]?.trim().toLowerCase() : "";

if (Boolean(id) === Boolean(email)) {
  fail("请且仅请提供 --id <用户ID> 或 --email <邮箱>");
}

const rows = id
  ? database.prepare("SELECT id, email, role FROM user WHERE id = ?").all(id)
  : database.prepare("SELECT id, email, role FROM user WHERE lower(email) = ?").all(email);

if (rows.length !== 1) fail(rows.length === 0 ? "没有找到用户，请先完成一次 OAuth 登录" : "匹配到多个用户，已拒绝授权");

const target = rows[0] as { id: string; email: string; role: string | null };
const grant = database.transaction(() => {
  const otherAdmin = database
    .prepare("SELECT id, email FROM user WHERE role = 'super_admin' AND id <> ?")
    .get(target.id) as { id: string; email: string } | undefined;
  if (otherAdmin) throw new Error(`已有其他超管：${otherAdmin.email}`);
  database.prepare("UPDATE user SET role = 'super_admin', updatedAt = ? WHERE id = ?").run(Date.now(), target.id);
});
try {
  grant();
} catch (error) {
  fail(error instanceof Error ? error.message : "授权事务失败");
}

console.log(`[admin:grant] 已授权 ${target.email} (${target.id})`);
console.log(`[admin:grant] 数据库：${config.databasePath}`);
database.close();
