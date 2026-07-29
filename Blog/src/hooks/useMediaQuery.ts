import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void, query: string): () => void {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => subscribe(cb, query),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 767px)');
}

export function useIsTablet(): boolean {
  return useMediaQuery('(max-width: 1023px)');
}

export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
