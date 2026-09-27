import { useEffect, useState } from 'react';
import { authBaseURL } from '@/lib/auth-client';
import type { Note } from '@/types';

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${authBaseURL}/api/content/note/index.json`, { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('Invalid content index');
        setNotes(data as Note[]);
        setError(false);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, []);

  return { notes, isLoading, error };
}
