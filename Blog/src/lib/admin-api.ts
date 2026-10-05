import { authBaseURL } from './auth-client';

export type UploadTarget = 'blog' | 'note';

export interface UploadResult {
  target: UploadTarget;
  category: string;
  slug: string;
  fileCount: number;
  byteCount: number;
  stored: true;
  published: boolean;
  publishedSlug?: string;
  publishFailed?: boolean;
  message: string;
  revision?: string;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as { message?: string; code?: string } & T;
  if (!response.ok) throw new AdminApiError(data.message || '请求失败', response.status, data.code || 'REQUEST_FAILED');
  return data;
}

export async function uploadFolder(target: UploadTarget, category: string, files: File[]) {
  const csrf = await readResponse<{ token: string }>(await fetch(`${authBaseURL}/api/admin/csrf`, {
    credentials: 'include',
  }));

  const firstPath = files[0]?.webkitRelativePath || '';
  const slug = firstPath.split('/')[0] || '';
  const form = new FormData();
  form.set('category', category);
  const manifest = files.map((file, index) => {
    const partId = `file_${index}`;
    form.append(partId, file, file.name);
    return { partId, relativePath: file.webkitRelativePath };
  });
  form.set('manifest', JSON.stringify({ slug, files: manifest }));

  return readResponse<UploadResult>(await fetch(`${authBaseURL}/api/admin/content/${target}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'X-CSRF-Token': csrf.token },
    body: form,
  }));
}

export async function publishSaved(target: UploadTarget, slug: string) {
  const csrf = await readResponse<{ token: string }>(await fetch(`${authBaseURL}/api/admin/csrf?action=publish`, {
    credentials: 'include',
  }));
  return readResponse<{ published: boolean; publishedSlug?: string; message: string }>(await fetch(`${authBaseURL}/api/admin/content/${target}/publish`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.token },
    body: JSON.stringify({ slug }),
  }));
}

export interface BlogSource {
  slug: string;
  category: string;
  title: string;
  draft: boolean;
  revision: string;
  markdown: string;
  metadata: Record<string, unknown>;
  files: Array<{ name: string; size: number; hash: string }>;
}

export interface ManagedPost {
  slug: string;
  category: string;
  title: string;
  draft: boolean;
  revision: string;
  published: boolean;
  hasBackup: boolean;
  publishFailed: boolean;
}

const blogAdminURL = `${authBaseURL}/api/admin/content/blog`;

export async function listManagedPosts(signal?: AbortSignal) {
  return readResponse<ManagedPost[]>(await fetch(blogAdminURL, { credentials: 'include', cache: 'no-store', signal }));
}

export async function readBlogSource(slug: string, signal?: AbortSignal) {
  return readResponse<BlogSource>(await fetch(`${blogAdminURL}/${encodeURIComponent(slug)}`, { credentials: 'include', cache: 'no-store', signal }));
}

export async function readBlogImage(slug: string, filename: string, signal?: AbortSignal) {
  const response = await fetch(`${blogAdminURL}/${encodeURIComponent(slug)}/images/${encodeURIComponent(filename)}`, { credentials: 'include', cache: 'no-store', signal });
  if (!response.ok) await readResponse(response);
  return new File([await response.blob()], filename);
}

export async function updateBlog(source: BlogSource, category: string, files: File[]) {
  const csrf = await readResponse<{ token: string }>(await fetch(`${authBaseURL}/api/admin/csrf?action=update`, { credentials: 'include' }));
  const form = new FormData();
  form.set('category', category);
  form.set('revision', source.revision);
  form.set('manifest', JSON.stringify({ slug: source.slug, files: files.map((file, index) => {
    const partId = `file_${index}`;
    form.append(partId, file, file.name);
    return { partId, relativePath: `${source.slug}/${file.name}` };
  }) }));
  return readResponse<UploadResult>(await fetch(`${blogAdminURL}/${encodeURIComponent(source.slug)}`, {
    method: 'PUT', credentials: 'include', headers: { 'X-CSRF-Token': csrf.token }, body: form,
  }));
}

export async function downloadBlog(slug: string, previous = false) {
  const url = `${blogAdminURL}/${encodeURIComponent(slug)}/download${previous ? '?version=previous' : ''}`;
  const response = await fetch(url, { method: 'HEAD', credentials: 'include' });
  if (!response.ok) await readResponse(response);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slug}${previous ? '-previous' : ''}.zip`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}
