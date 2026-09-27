export const GUESTBOOK_MAX_LENGTH = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function guestbookLength(value: string) {
  return Array.from(value).length;
}

export function normalizeGuestbookBody(value: unknown) {
  if (typeof value !== "string") return { ok: false as const, message: "留言内容格式不正确" };
  const body = value.trim();
  const length = guestbookLength(body);
  if (length < 1) return { ok: false as const, message: "留言不能为空" };
  if (length > GUESTBOOK_MAX_LENGTH) return { ok: false as const, message: "留言不能超过 500 个字符" };
  return { ok: true as const, body };
}

export function isGuestbookId(value: string) {
  return UUID.test(value);
}

export function encodeCursor(createdAt: number, id: string) {
  return Buffer.from(JSON.stringify({ t: createdAt, id }), "utf8").toString("base64url");
}

export function decodeCursor(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (Object.keys(record).length !== 2) return null;
    if (typeof record.t !== "number" || !Number.isSafeInteger(record.t) || record.t < 0) return null;
    if (typeof record.id !== "string" || !UUID.test(record.id)) return null;
    return { t: record.t, id: record.id };
  } catch {
    return null;
  }
}
