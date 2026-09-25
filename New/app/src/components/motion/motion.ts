import { useEffect, useSyncExternalStore } from 'react';

const key = 'moqian-reduced-motion';
const event = 'moqian:motion';
const media = '(prefers-reduced-motion: reduce)';
let memoryPreference: boolean | undefined;
function voluntary() {
  if (memoryPreference !== undefined) return memoryPreference;
  try { return localStorage.getItem(key) === 'true'; } catch { return false; }
}
function snapshot() {
  return `${window.matchMedia(media).matches}:${voluntary()}:${window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches}`;
}
function subscribe(listener: () => void) {
  const system = window.matchMedia(media);
  const desktop = window.matchMedia('(min-width: 1024px) and (pointer: fine)');
  system.addEventListener('change', listener);
  desktop.addEventListener('change', listener);
  window.addEventListener(event, listener);
  const storage = () => { memoryPreference = undefined; listener(); };
  window.addEventListener('storage', storage);
  return () => {
    system.removeEventListener('change', listener);
    desktop.removeEventListener('change', listener);
    window.removeEventListener(event, listener);
    window.removeEventListener('storage', storage);
  };
}
export function useMotionPolicy() {
  const value = useSyncExternalStore(subscribe, snapshot, () => 'true:false:false');
  const [system, saved, desktop] = value.split(':').map(x => x === 'true');
  const requested = memoryPreference ?? saved;
  const reduced = system || requested;
  return { reduced, system, requested, quality: reduced ? 'static' as const : desktop ? 'desktop' as const : 'mobile' as const };
}
export function setReducedMotion(value: boolean) {
  memoryPreference = value;
  try { localStorage.setItem(key, String(value)); } catch { void 0; }
  window.dispatchEvent(new Event(event));
}
export function useMotionRoot() {
  const policy = useMotionPolicy();
  useEffect(() => {
    document.documentElement.dataset.motion = policy.reduced ? 'reduced' : 'full';
    window.dispatchEvent(new Event('moqian:motion-applied'));
    return () => { delete document.documentElement.dataset.motion; };
  }, [policy.reduced]);
  return policy;
}
