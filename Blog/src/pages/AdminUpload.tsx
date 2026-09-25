import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import BlogBrandHome from '@/components/BlogBrandHome';
import AuthMenu from '@/components/AuthMenu';
import { authClient } from '@/lib/auth-client';
import { AdminApiError, uploadFolder, type UploadResult } from '@/lib/admin-api';

const allowed = new Set(['md', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif']);

function validateFiles(files: File[]) {
  if (!files.length) return '请选择一个文章文件夹';
  const roots = new Set(files.map((file) => file.webkitRelativePath.split('/')[0]));
  if (roots.size !== 1 || [...roots][0] === '') return '一次只能选择一个完整文件夹';
  if (files.some((file) => file.webkitRelativePath.split('/').length !== 2)) return '文件夹内不能包含子目录';
  if (files.filter((file) => file.name === 'index.md').length !== 1) return '文件夹必须且只能包含一个 index.md';
  if (files.some((file) => file.name !== 'index.md' && !allowed.has(file.name.split('.').pop()?.toLowerCase() || ''))) return '包含不支持的文件类型';
  if (files.some((file) => file.name.toLowerCase().endsWith('.md') && file.name !== 'index.md')) return '除 index.md 外不能包含其他 Markdown 文件';
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test([...roots][0])) return '文件夹名（slug）只允许小写字母、数字和单连字符';
  return '';
}

export default function AdminUpload() {
  const { data: session, isPending } = authClient.useSession();
  const [category, setCategory] = useState('随笔');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const validation = useMemo(() => validateFiles(files), [files]);
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  const role = session?.user.role;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (validation || !category.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(await uploadFolder('blog', category.trim(), files));
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : '身份服务暂时不可用');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-upload-page min-h-screen text-[#e5e5e5]">
      <header className="border-b border-[#1a1a1a]">
        <div className="max-w-[960px] mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <BlogBrandHome />
          <div className="flex items-center gap-5"><Link to="/">博客首页</Link><AuthMenu /></div>
        </div>
      </header>
      <main className="admin-upload max-w-[760px] mx-auto px-6 md:px-8 py-14 md:py-20">
        <p className="admin-upload__eyebrow">ADMIN · SOURCE INTAKE</p>
        <h1>上传博文源文件</h1>
        <p className="admin-upload__lead">保存一个新的 page bundle。不会覆盖已有 slug，也不会自动构建或上线。</p>

        {isPending ? <p className="admin-upload__state">正在确认身份…</p> : !session ? (
          <div className="admin-upload__state"><p>请先从右上角使用 Google 或 GitHub 登录。</p></div>
        ) : role !== 'super_admin' ? (
          <div className="admin-upload__state" role="alert"><strong>403 · 无权限</strong><p>当前账户不是超管。</p></div>
        ) : (
          <form onSubmit={submit} className="admin-upload__form">
            <label>分类<input value={category} onChange={(event) => setCategory(event.target.value)} maxLength={80} required /></label>
            <label className="admin-upload__picker">
              文章文件夹
              <input
                type="file"
                multiple
                {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                onChange={(event) => { setFiles(Array.from(event.target.files || [])); setResult(null); }}
              />
            </label>
            {files.length > 0 && (
              <div className="admin-upload__preview">
                <strong>{files[0].webkitRelativePath.split('/')[0]}</strong>
                <span>{files.length} 个文件 · {(bytes / 1024 / 1024).toFixed(2)} MiB</span>
                <ul>{files.map((file) => <li key={file.webkitRelativePath}>{file.webkitRelativePath}</li>)}</ul>
              </div>
            )}
            {validation && files.length > 0 && <p className="admin-upload__error" role="alert">{validation}</p>}
            {error && <p className="admin-upload__error" role="alert">{error}</p>}
            <button type="submit" disabled={busy || Boolean(validation) || !category.trim()}>{busy ? '正在保存…' : '保存源文件'}</button>
          </form>
        )}

        {result && (
          <div className="admin-upload__success" role="status">
            <strong>{result.category}/{result.slug} 已保存</strong>
            <p>{result.message}</p>
            <code>$env:BLOG_CONTENT_ROOT='&lt;与 Site-api 相同的内容根&gt;'; npm --prefix Blog run build</code>
          </div>
        )}
      </main>
    </div>
  );
}
