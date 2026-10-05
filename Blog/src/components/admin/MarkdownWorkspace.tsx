import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { LinkedMarkdownEditor } from './linked-markdown-editor';
import { PreviewUpdates } from '@/lib/preview-updates';

export default function MarkdownWorkspace({ markdown, onChange, preview, dirty, disabled = false }: {
  markdown: string;
  onChange: (value: string) => void;
  preview: (markdown: string) => ReactNode;
  dirty: boolean;
  disabled?: boolean;
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [previewMarkdown, setPreviewMarkdown] = useState(markdown);
  const dialog = useRef<HTMLDialogElement>(null);
  const inlineHost = useRef<HTMLDivElement>(null);
  const fullscreenHost = useRef<HTMLDivElement>(null);
  const inlinePreview = useRef<HTMLDivElement>(null);
  const fullscreenPreview = useRef<HTMLDivElement>(null);
  const editor = useRef<LinkedMarkdownEditor | null>(null);
  const initialText = useRef(markdown);
  const onChangeRef = useRef(onChange);
  const composing = useRef(false);
  const previewUpdates = useMemo(() => new PreviewUpdates(setPreviewMarkdown), []);
  const schedulePreview = useCallback((text: string, isComposing: boolean) => {
    composing.current = isComposing;
    previewUpdates.schedule(text, isComposing);
  }, [previewUpdates]);
  useLayoutEffect(() => { onChangeRef.current = onChange; });

  useLayoutEffect(() => {
    const instance = new LinkedMarkdownEditor(inlineHost.current!, initialText.current, {
      onChange: (text, isComposing) => { onChangeRef.current(text); schedulePreview(text, isComposing); },
      onCompositionEnd: (text) => schedulePreview(text, false),
      onJump: () => setView('edit'),
    });
    editor.current = instance;
    return () => { instance.destroy(); editor.current = null; previewUpdates.clear(); };
  }, [schedulePreview, previewUpdates]);

  useLayoutEffect(() => {
    const modal = dialog.current!;
    if (!expanded) { modal.close(); editor.current?.move(inlineHost.current!, false); return; }
    modal.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    editor.current?.move(fullscreenHost.current!, true);
    return () => { modal.close(); document.body.style.overflow = previousOverflow; };
  }, [expanded]);

  useEffect(() => {
    editor.current?.setText(markdown);
    schedulePreview(markdown, composing.current);
  }, [markdown, schedulePreview]);

  useEffect(() => { editor.current?.setDisabled(disabled); }, [disabled]);

  useLayoutEffect(() => {
    const rendered = expanded ? fullscreenPreview.current : inlinePreview.current;
    if (rendered) editor.current?.attachPreview(rendered, previewMarkdown);
  }, [expanded, view, previewMarkdown, preview]);

  const renderedPreview = useMemo(() => preview(previewMarkdown), [preview, previewMarkdown]);
  function setExpandedView(value: boolean) { editor.current?.rememberAnchor(); setExpanded(value); }
  function switches() {
    return <div className="editor-switch" role="group" aria-label="正文视图">{(['edit', 'preview'] as const).map((value) => <button key={value} type="button" aria-pressed={view === value} onClick={() => { editor.current?.rememberAnchor(); setView(value); }}>{value === 'edit' ? '编辑' : '预览'}</button>)}</div>;
  }
  function panes(fullscreen: boolean) {
    return <div className="editor-writing" data-view={view}>
      <div className="editor-pane editor-pane--source"><p className="editor-pane__label">Markdown</p><div ref={fullscreen ? fullscreenHost : inlineHost} className="editor-code-host" /></div>
      <section className="editor-pane editor-pane--preview" aria-label="文章预览"><p className="editor-pane__label" aria-hidden="true">预览</p><div ref={fullscreen ? fullscreenPreview : inlinePreview} className="editor-preview"><div>{fullscreen || !expanded ? renderedPreview : null}</div></div></section>
    </div>;
  }
  return <>
    <section className="editor-section" aria-labelledby={`${id}-body`}>
      <div className="editor-section__head"><span>02</span><h2 id={`${id}-body`}>正文</h2><div className="editor-section__tools">{switches()}<button type="button" className="ui-btn" aria-haspopup="dialog" onClick={() => { setView('edit'); setExpandedView(true); }}><Maximize2 />全屏编辑</button></div></div>
      <p className="editor-link-hint">光标定位预览，双击预览编辑</p>
      {panes(false)}
    </section>
    <dialog ref={dialog} className="editor-fullscreen" aria-labelledby={`${id}-fullscreen-title`} onCancel={(event) => { event.preventDefault(); setExpandedView(false); }}>
      {expanded && <>
        <header className="editor-fullscreen__header"><div><h2 id={`${id}-fullscreen-title`}>全屏写作</h2><p>光标定位预览，双击预览编辑</p></div><div className="editor-fullscreen__tools">{switches()}<button type="button" className="ui-btn" onClick={() => setExpandedView(false)}><Minimize2 />退出全屏</button></div></header>
        <div className="editor-fullscreen__content">{panes(true)}</div>
        <footer className="editor-fullscreen__footer"><span role="status">{dirty ? '有未保存的修改' : '暂无修改'}</span><span>退出后保留编辑内容，返回编辑页保存并发布 · Esc 退出</span></footer>
      </>}
    </dialog>
  </>;
}
