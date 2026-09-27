import { useEffect, useRef, useState } from 'react';
import { formatGuestbookTime, type GuestbookEntry } from '@/lib/guestbook';

interface GuestbookListProps {
  status: 'loading' | 'ready' | 'error';
  items: GuestbookEntry[];
  notice: string;
  nextCursor: string | null;
  loadingMore: boolean;
  onRetry: () => void;
  onMore: () => void;
  onDelete: (id: string) => Promise<void>;
}

function Avatar({ name, image }: { name: string; image: string | null }) {
  const [failed, setFailed] = useState(false);
  const initial = Array.from(name.trim())[0] || '访';
  if (!image || failed) return <span className="guestbook-avatar guestbook-avatar--fallback" aria-hidden="true">{initial}</span>;
  return <img className="guestbook-avatar" src={image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

export default function GuestbookList({ status, items, notice, nextCursor, loadingMore, onRetry, onMore, onDelete }: GuestbookListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [target, setTarget] = useState<GuestbookEntry | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!target) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
  }, [target]);

  async function confirmDelete() {
    if (!target || deleting) return;
    setDeleting(true);
    let removed = false;
    try {
      await onDelete(target.id);
      removed = true;
    } catch {
      removed = false;
    } finally {
      setDeleting(false);
      dialogRef.current?.close();
    }
    if (removed) listRef.current?.focus({ preventScroll: true });
  }

  return (
    <div ref={listRef} className="guestbook-list" tabIndex={-1} aria-busy={status === 'loading'}>
      {notice && <p className="guestbook-error" role="alert">{notice}</p>}
      {status === 'loading' && <p className="guestbook-status">正在读取留言</p>}
      {status === 'error' && (
        <div className="guestbook-status">
          <p>留言暂时没有加载出来</p>
          <button type="button" className="guestbook-more" onClick={onRetry}>重试</button>
        </div>
      )}
      {status === 'ready' && items.length === 0 && <p className="guestbook-empty">这里还很安静，写下第一条留言吧。</p>}
      {status === 'ready' && items.map((entry) => (
        <article key={entry.id} className="guestbook-item">
          <Avatar name={entry.author.name} image={entry.author.image} />
          <div className="guestbook-meta">
            <span className="guestbook-name">{entry.author.name}</span>
            {entry.author.owner && <span className="guestbook-owner">站主</span>}
            <time className="guestbook-time" dateTime={new Date(entry.createdAt).toISOString()}>{formatGuestbookTime(entry.createdAt)}</time>
          </div>
          <p className="guestbook-body">{entry.body}</p>
          {entry.canDelete && <button type="button" className="guestbook-delete" aria-label="删除这条留言" onClick={() => setTarget(entry)}>删除</button>}
        </article>
      ))}
      {status === 'ready' && nextCursor && (
        <button type="button" className="guestbook-more" onClick={onMore} disabled={loadingMore} aria-busy={loadingMore}>
          {loadingMore ? '正在加载…' : '加载更多'}
        </button>
      )}
      <dialog
        ref={dialogRef}
        className="guestbook-dialog"
        aria-labelledby="guestbook-delete-title"
        onCancel={(event) => { if (deleting) event.preventDefault(); }}
        onKeyDown={(event) => {
          if (event.key !== 'Escape') return;
          event.preventDefault();
          if (!deleting) dialogRef.current?.close();
        }}
        onClose={() => setTarget(null)}
      >
        <p id="guestbook-delete-title">删除这条留言？</p>
        <div className="guestbook-dialog-actions">
          <button ref={cancelRef} type="button" className="guestbook-button" data-cancel disabled={deleting} onClick={() => dialogRef.current?.close()}>取消</button>
          <button type="button" className="guestbook-button guestbook-button--danger" disabled={deleting} aria-busy={deleting} onClick={() => void confirmDelete()}>{deleting ? '正在删除…' : '删除'}</button>
        </div>
      </dialog>
    </div>
  );
}
