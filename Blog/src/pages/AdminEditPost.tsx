import { useCallback, useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useBeforeUnload, useBlocker, useLocation, useParams } from 'react-router';
import AdminShell from '@/components/admin/AdminShell';
import UpdateReview, { type ReviewData } from '@/components/admin/UpdateReview';
import MarkdownWorkspace from '@/components/admin/MarkdownWorkspace';
import PostReader from '@/components/PostReader';
import { Icon } from '@/components/account/icons';
import { formatBytes } from '@/components/upload/validation';
import { usePosts } from '@/hooks/usePosts';
import { authClient } from '@/lib/auth-client';
import { AdminApiError, downloadBlog, publishSaved, readBlogImage, readBlogSource, updateBlog, type BlogSource, type UploadResult } from '@/lib/admin-api';
import { editorFields, fileHash, imageChanges, serializeMarkdown, type EditorFields } from '@/lib/blog-editor';
import { prepareEditorPreview, rangeAttributes } from '@/lib/editor-preview';
import type { Post } from '@/types';

const empty: EditorFields = { title: '', summary: '', tags: '', category: '', date: '', updated: '', cover: '', draft: false, body: '' };

export default function AdminEditPost() {
  const { slug = '' } = useParams();
  return <AdminShell title="编辑博文" description={<>文章链接 <code>/blog/post/{slug}</code> 修改后保持不变。网页修改后可下载文章包，更新本地文件。</>}><Editor key={slug} slug={slug} /></AdminShell>;
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return <div className={wide ? 'ui-field editor-meta__wide' : 'ui-field'}>
    <label className="ui-field__label" htmlFor={id}>{label}</label>
    {children(id, hintId)}
    {hint && <p className="ui-field__hint" id={hintId}>{hint}</p>}
  </div>;
}

function Editor({ slug }: { slug: string }) {
  const location = useLocation();
  const { data: session } = authClient.useSession();
  const { posts } = usePosts();
  const [source, setSource] = useState<BlogSource | null>(null);
  const [original, setOriginal] = useState('');
  const [fields, setFields] = useState<EditorFields>(empty);
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [review, setReview] = useState<ReviewData | null>(null);
  const [conflict, setConflict] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [reload, setReload] = useState(0);
  const sectionId = useId();
  const blocker = useBlocker(dirty);
  const leaveDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (blocker.state === 'blocked') leaveDialog.current?.showModal();
    else leaveDialog.current?.close();
  }, [blocker.state]);
  useBeforeUnload((event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  useEffect(() => {
    document.title = '编辑博文 · Moqian';
    if (session?.user.role !== 'super_admin') return;
    const controller = new AbortController();
    async function load() {
      const item = await readBlogSource(slug, controller.signal);
      const replacement = (location.state as { replacement?: File[]; category?: string } | null)?.replacement;
      const files = replacement || await Promise.all(item.files.filter((file) => file.name !== 'index.md').map(async (file) => {
        const image = await readBlogImage(slug, file.name, controller.signal);
        if (await fileHash(image) !== file.hash) throw new Error('读取期间文章发生变化，请重新读取');
        return image;
      }));
      const raw = replacement ? await replacement.find((file) => file.name === 'index.md')!.text() : item.markdown;
      const category = replacement ? (location.state as { category: string }).category : item.category;
      const initial = editorFields(raw, category);
      if (controller.signal.aborted) return;
      setSource(item); setOriginal(raw); setFields(initial);
      setImages(files.filter((file) => file.name !== 'index.md')); setError(''); setDirty(Boolean(replacement));
      if (replacement) {
        const changes = await imageChanges(item.files, files);
        if (!controller.signal.aborted) setReview({ source: item, markdown: raw, category, files, images: changes });
      }
    }
    void load().catch((cause: Error) => { if (!controller.signal.aborted) setError(cause.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [slug, session?.user.role, location.state, reload]);

  const urls = useMemo(() => new Map(images.map((file) => [file.name, URL.createObjectURL(file)])), [images]);
  useEffect(() => () => { urls.forEach((url) => URL.revokeObjectURL(url)); }, [urls]);
  const coverUrl = urls.get(fields.cover.replace(/^\.\//, '')) || (/^(https?:\/\/|\/)/.test(fields.cover) ? fields.cover : '');
  const { title, category, tags } = fields;
  const renderPreview = useCallback((body: string) => {
    const sourceDocument = prepareEditorPreview(body, !title);
    const preview: Post = {
      id: slug, title: title || /^\n*# ([^\n]+)(?:\n|$)/.exec(body)?.[1] || slug,
      content: body, category, tags: tags.split(/[,，]/).filter(Boolean),
      aliases: Array.isArray(source?.metadata.aliases) ? source.metadata.aliases as string[] : [],
      createdAt: 0, updatedAt: 0,
    };
    return <>{coverUrl && <img className="editor-preview__cover" src={coverUrl} alt="封面预览" />}<h2 className="article__title editor-preview__title" {...rangeAttributes(sourceDocument.titleRange)}>{preview.title}</h2><PostReader post={preview} allPosts={[preview, ...posts.filter((post) => post.id !== slug)]} onNavigate={(link) => setError(`双链预览：${link}`)} imageUrls={urls} preview sourceDocument={sourceDocument} /></>;
  }, [title, category, tags, source, slug, coverUrl, posts, urls]);
  function change<K extends keyof EditorFields>(key: K, value: EditorFields[K]) {
    setFields((previous) => ({ ...previous, [key]: value })); setDirty(true); setResult(null); setError('');
  }
  async function prepare(event: FormEvent) {
    event.preventDefault();
    if (!source || busy) return;
    setBusy(true); setError('');
    try {
      const markdown = serializeMarkdown(original, fields);
      const files = [new File([markdown], 'index.md', { type: 'text/markdown' }), ...images];
      setReview({ source, markdown, category: fields.category.trim(), files, images: await imageChanges(source.files, files) });
    } catch (cause) { setError(cause instanceof Error ? cause.message : '暂时无法准备更新'); }
    finally { setBusy(false); }
  }
  async function confirm() {
    if (!review || busy) return;
    setBusy(true); setError('');
    try {
      const outcome = await updateBlog(review.source, review.category, review.files);
      setResult(outcome); setDirty(false); setConflict(false); setReview(null);
      setOriginal(review.markdown); setFields(editorFields(review.markdown, review.category));
      setSource({ ...review.source, markdown: review.markdown, category: review.category, revision: outcome.revision!, files: await Promise.all(review.files.map(async (file) => ({ name: file.name, size: file.size, hash: await fileHash(file) }))) });
    } catch (cause) {
      if (cause instanceof AdminApiError && cause.code === 'REVISION_CONFLICT') {
        try {
          const latest = await readBlogSource(slug);
          setReview({ ...review, source: latest, images: await imageChanges(latest.files, review.files) });
          setSource(latest); setConflict(true); setError('服务器文章已变化，你的编辑已保留，请对比后重新确认。');
        } catch { setError('检测到版本冲突，暂时无法读取最新版本。请稍后再次确认。'); }
      } else setError(cause instanceof Error ? cause.message : '保存失败，请检查网络后重试');
    } finally { setBusy(false); }
  }
  async function retry() {
    if (!result || busy) return;
    setBusy(true); setError('');
    try { setResult({ ...result, ...await publishSaved('blog', slug), publishFailed: false }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '发布失败，请重试'); }
    finally { setBusy(false); }
  }
  async function download() {
    setBusy(true); setError('');
    try { await downloadBlog(slug); }
    catch (cause) { setError(cause instanceof Error ? cause.message : '下载失败'); }
    finally { setBusy(false); }
  }
  const categories = [...new Set(posts.map((post) => post.category).filter((value): value is string => Boolean(value)))];
  const saveState = busy ? 'busy' : dirty ? 'dirty' : result ? (result.publishFailed ? 'failed' : 'saved') : 'idle';
  const saveLabel = { busy: '正在准备更新…', dirty: '有未保存的修改', failed: '修改已保存，发布失败', saved: result?.published ? '修改已发布' : '草稿已保存', idle: '暂无修改' }[saveState];
  const errorPanel = error && <p className="ui-note ui-note--error" role="alert">{error}</p>;
  return <>
    <dialog ref={leaveDialog} className="ws-dialog" aria-labelledby={`${sectionId}-leave`} aria-describedby={`${sectionId}-leave-text`} onCancel={(event) => { event.preventDefault(); if (blocker.state === 'blocked') blocker.reset(); }}>
      <p className="ws-kicker" lang="en">Unsaved</p>
      <h2 id={`${sectionId}-leave`}>还有未保存的修改</h2>
      <p id={`${sectionId}-leave-text`}>离开后将丢失当前编辑。</p>
      <div className="ws-dialog__actions"><button type="button" className="ui-btn ui-btn--primary" autoFocus onClick={() => { if (blocker.state === 'blocked') blocker.reset(); }}>继续编辑</button><button type="button" className="ui-btn ui-btn--danger" onClick={() => { if (blocker.state === 'blocked') blocker.proceed(); }}>放弃修改并离开</button></div>
    </dialog>
    {loading ? <p role="status" className="ws-loading">正在读取正文与配图…</p> : !source ? <>{errorPanel}<button type="button" className="ui-btn" onClick={() => setReload((value) => value + 1)}>重新读取</button></> : <>
      {errorPanel}
      {result && <section className="editor-result" data-state={result.publishFailed ? 'failed' : 'saved'} role="status"><div><h2>{result.publishFailed ? '修改已保存，线上仍为旧版' : result.published ? '修改已发布' : '草稿已保存'}</h2><p>{result.message}</p></div><div className="editor-result__actions">{result.publishFailed && <button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={() => void retry()}>{busy ? '正在重试…' : '重试发布'}</button>}<button type="button" className="ui-btn" disabled={busy} onClick={() => void download()}>下载当前文章包</button>{result.published && <Link className="ui-btn ui-btn--quiet" to={`/post/${encodeURIComponent(slug)}`}>查看文章 →</Link>}</div></section>}
      {review ? <UpdateReview review={review} conflict={conflict} busy={busy} onConfirm={() => void confirm()} onCancel={() => { setReview(null); setConflict(false); }} /> : <form className="editor" onSubmit={(event) => void prepare(event)} aria-busy={busy}>
        <fieldset disabled={busy} className="editor__fieldset">
          <section className="editor-section" aria-labelledby={`${sectionId}-meta`}>
            <div className="editor-section__head"><span>01</span><h2 id={`${sectionId}-meta`}>文章信息</h2></div>
            <div className="editor-meta">
              <Field label="标题" hint="留空时使用正文首个 H1" wide>{(id, hintId) => <input id={id} className="ui-input" value={fields.title} aria-describedby={hintId} onChange={(event) => change('title', event.target.value)} />}</Field>
              <Field label="分类">{(id) => <><input id={id} className="ui-input" value={fields.category} required list={`${sectionId}-categories`} autoComplete="off" onChange={(event) => change('category', event.target.value)} /><datalist id={`${sectionId}-categories`}>{categories.map((value) => <option key={value} value={value} />)}</datalist></>}</Field>
              <Field label="标签" hint="用逗号分隔">{(id, hintId) => <input id={id} className="ui-input" value={fields.tags} aria-describedby={hintId} onChange={(event) => change('tags', event.target.value)} />}</Field>
              <Field label="摘要" hint="显示在博客首页卡片与订阅中" wide>{(id, hintId) => <textarea id={id} className="ui-input editor-summary" rows={3} value={fields.summary} aria-describedby={hintId} onChange={(event) => change('summary', event.target.value)} />}</Field>
              {(['date', 'updated'] as const).map((key) => <Field key={key} label={key === 'date' ? '发布日期' : '更新日期'} hint="例如 2026-10-05，留空保留无日期状态">{(id, hintId) => <input id={id} className="ui-input" value={fields[key]} aria-describedby={hintId} onChange={(event) => change(key, event.target.value)} />}</Field>)}
              <Field label="封面">{(id) => <select id={id} className="ui-input" value={fields.cover} onChange={(event) => change('cover', event.target.value)}><option value="">无封面</option>{fields.cover && !images.some((file) => `./${file.name}` === fields.cover) && <option value={fields.cover}>{fields.cover}</option>}{images.map((file) => <option key={file.name} value={`./${file.name}`}>{file.name}</option>)}</select>}</Field>
              <label className="editor-check"><input type="checkbox" checked={fields.draft} onChange={(event) => change('draft', event.target.checked)} /><span>草稿<small>保存后暂不公开</small></span></label>
            </div>
          </section>
          <MarkdownWorkspace markdown={fields.body} onChange={(value) => change('body', value)} dirty={dirty} disabled={busy} preview={renderPreview} />
          <section className="editor-section" aria-labelledby={`${sectionId}-assets`}>
            <div className="editor-section__head"><span>03</span><h2 id={`${sectionId}-assets`}>配图</h2><small>{images.length} 张</small></div>
            <label className="ui-btn editor-picker"><Icon name="image" />添加或替换图片<input type="file" accept=".png,.jpg,.jpeg,.gif,.webp,.avif" multiple onChange={(event) => {
              const additions = Array.from(event.target.files || []);
              setImages((previous) => [...previous.filter((file) => !additions.some((item) => item.name === file.name)), ...additions]);
              setDirty(true); setResult(null); event.target.value = '';
            }} /></label>
            <p className="ui-field__hint">同名文件替换原图；正文使用 ./图片名 引用。删除后请一并修改对应引用。</p>
            {images.length > 0 && <ul className="editor-images">{images.map((file) => <li key={file.name}><img src={urls.get(file.name)} alt="" /><div><span>{file.name}</span><small>{formatBytes(file.size)}{fields.cover === `./${file.name}` && ' · 封面'}</small></div><button type="button" className="ui-btn ui-btn--quiet" aria-label={`删除 ${file.name}`} onClick={() => { setImages((previous) => previous.filter((item) => item.name !== file.name)); if (fields.cover.replace(/^\.\//, '') === file.name) change('cover', ''); setDirty(true); setResult(null); }}>删除</button></li>)}</ul>}
          </section>
          <div className="editor-savebar" data-state={saveState}>
            <p className="editor-savebar__status" aria-live="polite"><span className="editor-savebar__dot" aria-hidden="true" />{saveLabel}</p>
            <div className="editor-savebar__actions"><Link className="ui-btn ui-btn--quiet" to="/admin/posts">返回管理博文</Link><button className="ui-btn ui-btn--primary" type="submit" disabled={!dirty}>{busy ? '正在准备…' : '保存并发布'}</button></div>
          </div>
        </fieldset>
      </form>}
    </>}
  </>;
}
