import { useEffect, useState } from 'react';
import { authBaseURL, authClient } from '@/lib/auth-client';
import type { Note } from '@/types';

export function useNotes() {
  const { data: session, isPending } = authClient.useSession();
  const viewerId = session?.user.id ?? null;
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [locked, setLocked] = useState(false);

  // 笔记正文需登录才能读取：带上会话 cookie，并在登录/退出后按读者身份重新拉取。
  useEffect(() => {
    if (isPending) return;
    const controller = new AbortController();
    fetch(`${authBaseURL}/api/content/note/index.json`, { cache: 'no-store', credentials: 'include', signal: controller.signal })
      .then((response) => {
        if (response.status === 401) {
          setNotes([]);
          setLocked(true);
          setError(false);
          return;
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json().then((data: unknown) => {
          if (!Array.isArray(data)) throw new Error('Invalid content index');
          setNotes(data as Note[]);
          setLocked(false);
          setError(false);
        });
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, [isPending, viewerId]);

  return { notes, isLoading: isPending || isLoading, error, locked };
}
