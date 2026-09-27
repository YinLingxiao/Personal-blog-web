import { useEffect, useState } from 'react';
import { authBaseURL } from '@/lib/auth-client';
import type { Post } from '@/types';

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${authBaseURL}/api/content/blog/index.json`, { cache: 'no-store', signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data: unknown) => {
        if (!Array.isArray(data)) throw new Error('Invalid content index');
        setPosts(data as Post[]);
        setError(false);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false); });
    return () => controller.abort();
  }, []);

  return { posts, isLoading, error };
}
