import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router';
import AuthMenu from '@/components/AuthMenu';
import { Icon } from '@/components/account/icons';
import { getUploadLinks } from '@/components/account/destinations';
import { authClient } from '@/lib/auth-client';
import { AdminApiError, uploadFolder, type UploadResult, type UploadTarget } from '@/lib/admin-api';
import { formatBytes, validateFiles } from './validation';
import './upload.css';

export default function UploadWorkspace({ target, brand, categories }: { target: UploadTarget; brand: ReactNode; categories: string[] }) {
  const isBlog = target === 'blog';
  const noun = isBlog ? '博文' : '笔记';
  const destination = isBlog ? '博客' : '笔记站';
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const [category, setCategory] = useState(isBlog ? '随笔' : '未分类');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<UploadResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const successHeading = useRef<HTMLHeadingElement>(null);
  const categoryId = useId();
  const suggestionsId = useId();
  const validationId = useId();
  const validation = useMemo(() => validateFiles(files), [files]);
  const bytes = files.reduce((sum, file) => sum + file.size, 0);
  const slug = files[0]?.webkitRelativePath.split('/')[0] || '';
  const isAdmin = session?.user.role === 'super_admin';
  const imageCount = files.filter((file) => file.name !== 'index.md').length;
  const links = getUploadLinks(target);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `上传${noun} · Moqian`;
    return () => { document.title = previousTitle; };
  }, [noun]);

  useEffect(() => {
    if (result) successHeading.current?.focus();
  }, [result]);

  function reset() {
    setFiles([]);
    setResult(null);
    setError('');
    if (fileInput.current) fileInput.current.value = '';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (validation || !category.trim() || busy || result) return;
    setBusy(true);
    setError('');
    try {
      setResult(await uploadFolder(target, category.trim(), files));
    } catch (cause) {
      setError(cause instanceof AdminApiError ? cause.message : '暂时无法保存，请检查网络后重试');
    } finally {
      setBusy(false);
    }
  }

  return <div className={`upload-workspace upload-workspace--${target}`}>
    <header className="upload-header"><div className="upload-shell upload-header__inner">
      {brand}<div className="upload-header__actions"><Link to="/" className="upload-back" aria-label={`返回${isBlog ? '博客' : '笔记'}`}><Icon name="back" /><span>返回{isBlog ? '博客' : '笔记'}</span></Link><AuthMenu /></div>
    </div></header>
    <main className="upload-shell upload-main">
      <div className="upload-intro">
        <div><p className="upload-kicker">WORKSPACE / {isBlog ? 'BALLADE' : 'ÉTUDE'}</p><h1>上传{noun}<span aria-hidden="true">.</span></h1><p className="upload-intro__description">{isBlog ? '让一篇文字，在这里落笔。' : '把新的思考，收进知识的星图。'}选择文件夹，将正文与配图一同保存。</p></div>
        {isAdmin && <span className="upload-access"><Icon name="shield" />超管工作区</span>}
      </div>
      <nav className="upload-tabs" aria-label="上传内容类型">{links.map((link) => <a href={link.href} key={link.target} aria-current={link.target === target ? 'page' : undefined}><Icon name={link.icon} />{link.label}<span>{link.target === 'blog' ? '01' : '02'}</span></a>)}</nav>

      {isPending ? <div className="upload-state" role="status"><span className="upload-state__icon"><Icon name="user" /></span><h2>正在确认身份…</h2><p>稍等片刻，即可继续。</p></div>
        : sessionError ? <div className="upload-state" role="alert"><span className="upload-state__icon"><Icon name="user" /></span><h2>暂时无法确认身份</h2><p>登录服务未响应，请稍后重试。</p><button type="button" className="upload-button" onClick={() => void refetch()}>重新连接<Icon name="arrow" /></button></div>
          : !session || !isAdmin ? <div className="upload-state"><span className="upload-state__icon"><Icon name={!session ? 'user' : 'shield'} /></span><p className="upload-kicker">{!session ? 'SIGN IN TO CONTINUE' : 'ACCESS REQUIRED'}</p><h2>{!session ? '登录后，继续创作。' : '此账号没有上传权限'}</h2><p>{!session ? '请使用已授权的 Google 或 GitHub 账号登录。' : '上传仅对超级管理员开放，请切换到已授权的账号。'}</p><AuthMenu /></div>
            : <div className="upload-layout">
              <div className="upload-editor">
                {result ? <section className="upload-success" role="status">
                  <span className="upload-state__icon"><Icon name="check" /></span><p className="upload-kicker">SAVED TO {isBlog ? 'BALLADE' : 'ÉTUDE'}</p>
                  <h2 ref={successHeading} tabIndex={-1}>{noun}已保存</h2><p>源文件已收好。完成站点构建与部署后，访客就能看到它。</p>
                  <dl><div><dt>保存位置</dt><dd>{result.category} / {result.slug}</dd></div><div><dt>文件</dt><dd>{result.fileCount} 个 · {formatBytes(result.byteCount)}</dd></div><div><dt>发布状态</dt><dd>等待发布</dd></div></dl>
                  <div className="upload-success__actions"><button className="upload-button" type="button" onClick={reset}>继续上传<Icon name="arrow" /></button><Link to="/" className="upload-back">返回{destination}</Link></div>
                </section> : <form onSubmit={submit} aria-busy={busy}>
                  <fieldset disabled={busy}>
                    <section className="upload-step">
                      <div className="upload-step__title"><span>01</span><label htmlFor={categoryId}>为{noun}选择分类</label></div>
                      <input className="upload-category" id={categoryId} value={category} onChange={(event) => { setCategory(event.target.value); setError(''); }} maxLength={80} required list={suggestionsId} placeholder={isBlog ? '例如：随笔' : '例如：高等数学'} autoComplete="off" aria-describedby={`${categoryId}-hint`} />
                      <datalist id={suggestionsId}>{categories.map((value) => <option key={value} value={value} />)}</datalist>
                      <p id={`${categoryId}-hint`} className="upload-hint">可以选择已有分类，或直接填写一个新分类。</p>
                    </section>
                    <section className="upload-step">
                      <div className="upload-step__title"><span>02</span><h2>选择{noun}文件夹</h2><small>正文与配图，一起上传</small></div>
                      <label className={`upload-picker${files.length ? ' upload-picker--selected' : ''}`}>
                        <input ref={fileInput} type="file" multiple {...({ webkitdirectory: '', directory: '' } as Record<string, string>)} aria-label={`选择${noun}文件夹`} aria-describedby={validationId}
                          onChange={(event) => { setFiles(Array.from(event.target.files || [])); setError(''); }} />
                        <span className="upload-picker__icon"><Icon name="folder" /></span>
                        <span className="upload-picker__copy"><strong>{files.length ? slug : '选择一个文件夹'}</strong><span>{files.length ? `${files.length} 个文件 · ${formatBytes(bytes)}` : '包含 index.md 和同级图片'}</span></span>
                        <span className="upload-picker__action">{files.length ? '重新选择' : '浏览文件夹'}<Icon name="arrow" /></span>
                      </label>
                      {files.length > 0 && <div className="upload-files"><div className="upload-files__heading"><span>文件清单</span><button type="button" onClick={reset} aria-label="清空已选文件">清空<Icon name="close" /></button></div><ul>{files.map((file) => <li key={file.webkitRelativePath}><Icon name={file.name === 'index.md' ? 'file' : 'image'} /><span>{file.name}</span><small>{formatBytes(file.size)}</small></li>)}</ul></div>}
                      <p className={files.length && validation ? 'upload-error' : 'upload-hint'} id={validationId} role={files.length && validation ? 'alert' : undefined}>{files.length ? validation || `已就绪 · 1 篇正文${imageCount ? `，${imageCount} 张配图` : ''}` : '一次上传一篇内容，文件夹内无需压缩。'}</p>
                    </section>
                    <section className="upload-submit">
                      <div><span className="upload-kicker">保存至{destination}</span><p>{category.trim() || '待填写分类'}<span> / </span>{slug || '待选择文件夹'}</p></div>
                      <button className="upload-button" type="submit" disabled={Boolean(validation) || !category.trim()}><Icon name="upload" />{busy ? '正在保存…' : `保存${noun}`}</button>
                    </section>
                  </fieldset>
                  {error && <p className="upload-error upload-error--request" role="alert">{error}</p>}
                  <p className="upload-publish-note">保存后还需构建并部署站点，内容才会公开。</p>
                </form>}
              </div>
              <aside className="upload-guide" aria-label="文件准备说明">
                <p className="upload-kicker">BEFORE YOU UPLOAD</p><h2>准备好一个文件夹</h2><p>一篇正文，几张配图。<br />让内容保持简单而完整。</p>
                <div className="upload-tree" aria-label="文件夹结构示例"><div><Icon name="folder" /><span>{isBlog ? 'my-first-post' : 'my-study-note'}/</span></div><div><Icon name="file" /><span>index.md</span><small>正文</small></div><div><Icon name="image" /><span>cover.jpg</span><small>可选配图</small></div></div>
                <ul><li>文件夹名使用小写字母、数字和连字符。</li><li>正文和图片放在同一层，图片用 <code>./cover.jpg</code> 引用。</li><li>如果正文已填写分类，请与左侧保持一致。</li><li>同名内容不会被覆盖，请使用新的文件夹名。</li></ul>
                <p className="upload-guide__formats">支持 PNG · JPG · GIF · WebP · AVIF</p>
              </aside>
            </div>}
      <footer className="upload-footer"><span>Moqian · {isBlog ? 'Ballade' : 'Étude'}</span><span>留一处安静，安放文字。</span></footer>
    </main>
  </div>;
}
