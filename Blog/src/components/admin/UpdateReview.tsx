import { diffLines } from 'diff';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { BlogSource } from '@/lib/admin-api';

export interface ReviewData {
  source: BlogSource;
  markdown: string;
  category: string;
  files: File[];
  images: { added: string[]; removed: string[]; replaced: string[] };
}

type Line = { kind: 'add' | 'del' | 'ctx'; text: string } | { kind: 'gap'; count: number };

const context = 3;

function linesOf(value: string) {
  const lines = value.split('\n');
  if (lines.length > 1 && lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export default function UpdateReview({ review, conflict, busy, onConfirm, onCancel }: {
  review: ReviewData; conflict: boolean; busy: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [expanded, setExpanded] = useState(false);
  const changes = useMemo(() => diffLines(review.source.markdown, review.markdown, { maxEditLength: 4000 }), [review]);
  const { lines, added, removed, collapsed } = useMemo(() => {
    const result: Line[] = [];
    let addedCount = 0;
    let removedCount = 0;
    let hidden = false;
    (changes || []).forEach((change, index) => {
      const parts = linesOf(change.value);
      if (change.added || change.removed) {
        const kind = change.added ? 'add' : 'del';
        if (change.added) addedCount += parts.length; else removedCount += parts.length;
        parts.forEach((text) => result.push({ kind, text }));
        return;
      }
      const head = index === 0 ? 0 : context;
      const tail = index === (changes || []).length - 1 ? 0 : context;
      if (expanded || parts.length <= head + tail + 1) {
        parts.forEach((text) => result.push({ kind: 'ctx', text }));
        return;
      }
      hidden = true;
      parts.slice(0, head).forEach((text) => result.push({ kind: 'ctx', text }));
      result.push({ kind: 'gap', count: parts.length - head - tail });
      parts.slice(parts.length - tail).forEach((text) => result.push({ kind: 'ctx', text }));
    });
    return { lines: result, added: addedCount, removed: removedCount, collapsed: hidden };
  }, [changes, expanded]);
  useEffect(() => { heading.current?.focus(); }, [conflict]);
  const categoryChanged = review.source.category !== review.category;
  const { images } = review;
  return <section className="review" aria-labelledby="review-title">
    <header className="review__head">
      <p className="ws-kicker" lang="en">{conflict ? 'Conflict' : 'Review'}</p>
      <h2 id="review-title" ref={heading} tabIndex={-1}>{conflict ? '文章已有新修改，请重新对比' : '确认更新这篇博文'}</h2>
      <p>{conflict ? '下面的差异基于服务器最新内容，你的编辑仍保留。确认后将用当前编辑替换该版本。' : '确认后更新原文章，链接保持不变。未出现在本次文章包里的旧图片将删除。'}</p>
    </header>
    <div className="review__summary">
      <div className="review-card" data-flag={categoryChanged ? 'change' : undefined}>
        <h3>分类</h3>
        {categoryChanged
          ? <><p className="review-cat"><del>{review.source.category}</del><span aria-hidden="true">→</span><ins>{review.category}</ins></p><p className="review-card__note">分类变化，文章链接保持不变</p></>
          : <><p className="review-cat"><span>{review.category}</span></p><p className="review-card__note">未变化</p></>}
      </div>
      <div className="review-card" data-flag={images.removed.length ? 'danger' : undefined}>
        <h3>配图</h3>
        <dl className="review-images">{(['added', 'replaced', 'removed'] as const).map((kind, index) => <div key={kind} data-kind={kind}><dt>{['新增', '替换', '删除'][index]}</dt><dd><strong>{images[kind].length}</strong>{images[kind].length > 0 && <span>{images[kind].join('、')}</span>}</dd></div>)}</dl>
        {images.removed.length > 0 && <p className="review-card__note review-card__note--danger" role="note">保存后将删除 {images.removed.length} 张图片，请确认正文不再引用。</p>}
      </div>
      <div className="review-card" data-flag={added || removed ? 'change' : undefined}>
        <h3>正文</h3>
        {changes ? <p className="review-stat">{added || removed ? <><span>＋{added} 行</span><span>−{removed} 行</span></> : <span>无变化</span>}</p> : <p className="review-stat"><span>改动较多</span></p>}
        <p className="review-card__note">{changes ? '按行比较 Markdown 源文' : '已改为并排显示两份全文'}</p>
      </div>
    </div>
    <div className="review-diff__head">
      <h3>正文差异</h3>
      <p className="ui-field__hint">删除的行标记 −，新增的行标记 ＋。</p>
      {changes && (collapsed || expanded) && <button type="button" className="ui-btn ui-btn--quiet" aria-pressed={expanded} onClick={() => setExpanded((value) => !value)}>{expanded ? '收起未变化内容' : '显示全部内容'}</button>}
    </div>
    {changes ? <div className="review-diff" tabIndex={0} role="region" aria-label="正文差异">{lines.map((line, index) => line.kind === 'gap'
      ? <div key={index} className="diff-gap">… {line.count} 行未变化 …</div>
      : <div key={index} className="diff-line" data-kind={line.kind}><span className="diff-sign" aria-hidden="true">{line.kind === 'add' ? '+' : line.kind === 'del' ? '−' : ''}</span>{line.kind !== 'ctx' && <span className="sr-only">{line.kind === 'add' ? '新增：' : '删除：'}</span>}<span className="diff-text">{line.text || ' '}</span></div>)}</div>
      : <div className="review-diff review-diff--split" tabIndex={0} role="region" aria-label="正文全文对比"><div><h4>服务器版本</h4><pre>{review.source.markdown}</pre></div><div><h4>本次更新</h4><pre>{review.markdown}</pre></div></div>}
    <div className="review__actions"><button type="button" className="ui-btn ui-btn--quiet" disabled={busy} onClick={onCancel}>返回编辑</button><button type="button" className="ui-btn ui-btn--primary" disabled={busy} onClick={onConfirm}>{busy ? '正在保存并发布…' : '确认更新并发布'}</button></div>
  </section>;
}
