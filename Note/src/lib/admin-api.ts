import { authBaseURL } from './auth-client';

export type UploadTarget = 'blog' | 'note';

export interface UploadResult {
  target: UploadTarget;
  category: string;
  slug: string;
  fileCount: number;
  byteCount: number;
  stored: true;
  buildTriggered: false;
  message: string;
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
