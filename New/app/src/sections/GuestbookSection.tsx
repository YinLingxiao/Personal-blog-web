import { useEffect, useRef, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { authClient } from '@/lib/auth-client';
import {
  GuestbookError,
  appendGuestbookEntries,
  applyGuestbookHead,
  deleteGuestbook,
  listGuestbook,
  postGuestbook,
  type GuestbookEntry,
} from '@/lib/guestbook';
import GuestbookComposer from '@/components/guestbook/GuestbookComposer';
import GuestbookList from '@/components/guestbook/GuestbookList';
import '@/components/guestbook/guestbook.css';

export default function GuestbookSection() {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user;
  const [draft, setDraft] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [items, setItems] = useState<GuestbookEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [notice, setNotice] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [sent, setSent] = useState(false);
  const loadingMoreRef = useRef(false);
  const epoch = useRef(0);
  const refreshing = useRef(false);
  const submitLock = useRef(false);
  const itemsRef = useRef(items);
  const cursorRef = useRef(nextCursor);
  const loadHeadRef = useRef<(force: boolean) => Promise<void>>(async () => {});

  async function loadHead(force: boolean) {
    if (refreshing.current && !force) return;
    const token = ++epoch.current;
    refreshing.current = true;
    try {
      const page = await listGuestbook();
      if (token !== epoch.current) return;
      const applied = applyGuestbookHead(itemsRef.current, page, cursorRef.current);
      itemsRef.current = applied.items;
      cursorRef.current = applied.nextCursor;
      setItems(applied.items);
      setNextCursor(applied.nextCursor);
      setStatus('ready');
      setNotice('');
    } catch (error) {
      if (token !== epoch.current) return;
      if (itemsRef.current.length) setNotice(error instanceof Error ? error.message : '留言没有刷新成功，请稍后再试');
      else setStatus('error');
    } finally {
      if (token === epoch.current) refreshing.current = false;
    }
  }

  loadHeadRef.current = loadHead;

  useEffect(() => {
    void loadHeadRef.current(true);
  }, [user?.id]);

  useEffect(() => {
    let last = 0;
    const wake = () => {
      if (document.visibilityState === 'hidden') return;
      const now = Date.now();
      if (now - last < 1000) return;
      last = now;
      void loadHeadRef.current(false);
    };
    window.addEventListener('focus', wake);
    document.addEventListener('visibilitychange', wake);
    return () => {
      window.removeEventListener('focus', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, []);

  async function submit() {
    if (submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    setComposeError('');
    setSent(false);
    try {
      await postGuestbook(draft);
      setDraft('');
      setSent(true);
      await loadHead(true);
    } catch (error) {
      if (error instanceof GuestbookError && error.status === 401) void refetch();
      setComposeError(error instanceof Error ? error.message : '留言服务暂时不可用，请稍后重试');
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  }

  async function remove(id: string) {
    setNotice('');
    try {
      await deleteGuestbook(id);
    } catch (error) {
      if (error instanceof GuestbookError && error.status === 401) void refetch();
      setNotice(error instanceof Error ? error.message : '留言没有删除，请稍后再试');
      throw error;
    }
    itemsRef.current = itemsRef.current.filter((item) => item.id !== id);
    setItems(itemsRef.current);
    await loadHead(true);
  }

  async function more() {
    const cursor = cursorRef.current;
    if (!cursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setNotice('');
    const token = epoch.current;
    try {
      const page = await listGuestbook(cursor);
      if (token !== epoch.current) return;
      itemsRef.current = appendGuestbookEntries(itemsRef.current, page.items);
      cursorRef.current = page.nextCursor;
      setItems(itemsRef.current);
      setNextCursor(page.nextCursor);
    } catch (error) {
      if (token !== epoch.current) return;
      setNotice(error instanceof Error ? error.message : '没有加载到更多留言');
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }

  return (
    <section id="guestbook" className="relative py-20 md:py-28">
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8">
        <div className="guestbook-column">
          <div ref={headerRef}>
            <SectionHeader number="06" title="留言簿" subtitle="Guestbook" titleFont="var(--font-body)" />
          </div>
          <p className="guestbook-lead">来过的话，留几句话吧。</p>
          <GuestbookComposer
            pending={isPending}
            user={user ? { name: user.name, image: user.image } : null}
            draft={draft}
            submitting={submitting}
            error={composeError}
            sent={sent}
            onDraft={(value) => { setDraft(value); setSent(false); if (composeError) setComposeError(''); }}
            onSubmit={() => void submit()}
          />
          <GuestbookList
            status={status}
            items={items}
            notice={notice}
            nextCursor={nextCursor}
            loadingMore={loadingMore}
            onRetry={() => void loadHead(true)}
            onMore={() => void more()}
            onDelete={remove}
          />
        </div>
      </div>
    </section>
  );
}
