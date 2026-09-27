import { authBaseURL } from '@/lib/auth-client';

export const GUESTBOOK_PAGE_SIZE = 20;
export const GUESTBOOK_MAX_LENGTH = 500;

export interface GuestbookEntry {
  id: string;
  body: string;
  createdAt: number;
  author: {
    name: string;
    image: string | null;
    owner: boolean;
  };
  canDelete: boolean;
}

export interface GuestbookPage {
  items: GuestbookEntry[];
  nextCursor: string | null;
}

export class GuestbookError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function guestbookLength(value: string) {
  return Array.from(value.trim()).length;
}

export function formatGuestbookTime(createdAt: number) {
  const date = new Date(createdAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function isOlder(item: GuestbookEntry, boundary: GuestbookEntry) {
  return item.createdAt < boundary.createdAt || (item.createdAt === boundary.createdAt && item.id < boundary.id);
}

export function mergeGuestbookEntries(previous: GuestbookEntry[], incoming: GuestbookEntry[]) {
  if (incoming.length < GUESTBOOK_PAGE_SIZE) return incoming;
  const oldest = incoming[incoming.length - 1];
  const seen = new Set(incoming.map((item) => item.id));
  const rest = previous.filter((item) => !seen.has(item.id) && isOlder(item, oldest));
  return [...incoming, ...rest];
}

export function applyGuestbookHead(previous: GuestbookEntry[], page: GuestbookPage, currentCursor: string | null) {
  const items = mergeGuestbookEntries(previous, page.items);
  const oldestIncoming = page.items[page.items.length - 1];
  const oldestMerged = items[items.length - 1];
  const extended = Boolean(oldestIncoming && oldestMerged && isOlder(oldestMerged, oldestIncoming));
  return {
    items,
    nextCursor: page.items.length < GUESTBOOK_PAGE_SIZE ? null : extended ? currentCursor : page.nextCursor,
  };
}

export function appendGuestbookEntries(previous: GuestbookEntry[], incoming: GuestbookEntry[]) {
  const seen = new Set(previous.map((item) => item.id));
  return [...previous, ...incoming.filter((item) => !seen.has(item.id))];
}

async function readError(response: Response) {
  try {
    const payload = await response.json() as { code?: unknown; message?: unknown };
    const message = response.status === 401
      ? '登录已过期，请重新登录'
      : typeof payload.message === 'string' && payload.message
        ? payload.message
        : '留言服务暂时不可用，请稍后重试';
    return new GuestbookError(response.status, typeof payload.code === 'string' ? payload.code : '', message);
  } catch {
    return new GuestbookError(response.status, '', response.status === 401 ? '登录已过期，请重新登录' : '留言服务暂时不可用，请稍后重试');
  }
}

function isEntry(value: unknown): value is GuestbookEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as GuestbookEntry;
  return typeof entry.id === 'string' && typeof entry.body === 'string' && typeof entry.createdAt === 'number' && typeof entry.canDelete === 'boolean' && Boolean(entry.author) && typeof entry.author.name === 'string';
}

async function readPage(response: Response) {
  if (!response.ok) throw await readError(response);
  const payload = await response.json() as GuestbookPage;
  if (!payload || !Array.isArray(payload.items) || !payload.items.every(isEntry)) {
    throw new GuestbookError(500, 'INVALID_RESPONSE', '留言服务暂时不可用，请稍后重试');
  }
  return { items: payload.items, nextCursor: typeof payload.nextCursor === 'string' ? payload.nextCursor : null };
}

export function listGuestbook(cursor?: string | null) {
  const url = new URL('/api/guestbook', authBaseURL);
  url.searchParams.set('limit', String(GUESTBOOK_PAGE_SIZE));
  if (cursor) url.searchParams.set('cursor', cursor);
  return fetch(url, { credentials: 'include', cache: 'no-store' }).then(readPage);
}

async function csrf(action: 'guestbook-create' | 'guestbook-delete') {
  const url = new URL('/api/session/csrf', authBaseURL);
  url.searchParams.set('action', action);
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!response.ok) throw await readError(response);
  const payload = await response.json() as { token?: unknown };
  if (!payload || typeof payload.token !== 'string' || !payload.token) {
    throw new GuestbookError(500, 'INVALID_RESPONSE', '留言服务暂时不可用，请稍后重试');
  }
  return payload.token;
}

export async function postGuestbook(body: string) {
  const token = await csrf('guestbook-create');
  const response = await fetch(new URL('/api/guestbook', authBaseURL), {
    method: 'POST',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify({ body }),
  });
  if (!response.ok) throw await readError(response);
  const entry = await response.json() as unknown;
  if (!isEntry(entry)) throw new GuestbookError(500, 'INVALID_RESPONSE', '留言服务暂时不可用，请稍后重试');
  return entry;
}

export async function deleteGuestbook(id: string) {
  const token = await csrf('guestbook-delete');
  const response = await fetch(new URL(`/api/guestbook/${encodeURIComponent(id)}`, authBaseURL), {
    method: 'DELETE',
    credentials: 'include',
    cache: 'no-store',
    headers: { 'X-CSRF-Token': token },
  });
  if (!response.ok) throw await readError(response);
}
