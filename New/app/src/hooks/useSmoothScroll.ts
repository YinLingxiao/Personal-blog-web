import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionPolicy } from '@/components/motion/motion';

gsap.registerPlugin(ScrollTrigger);
let lenisInstance: Lenis | null = null;
export function scrollToSection(target: string | number, history = true) {
  const el = typeof target === 'string' ? document.getElementById(target.slice(1)) : null;
  const top = typeof target === 'number' ? target : el ? window.scrollY + el.getBoundingClientRect().top - 88 : 0;
  if (history) window.history.pushState(null, '', typeof target === 'string' ? target : `${location.pathname}${location.search}`);
  if (lenisInstance) lenisInstance.scrollTo(top, { immediate: true, force: true });
  else window.scrollTo({ top, behavior: 'instant' });
  if (el) { el.tabIndex = -1; el.focus({ preventScroll: true }); }
}
export function stopScroll() { lenisInstance?.stop(); }
export function startScroll() { lenisInstance?.start(); }
export function useSmoothScroll() {
  const { reduced, quality } = useMotionPolicy();
  useEffect(() => {
    if (reduced || quality !== 'desktop') return;
    const lenis = new Lenis({ lerp: .09, smoothWheel: true, syncTouch: false });
    lenisInstance = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    return () => { gsap.ticker.remove(tick); lenis.destroy(); if (lenisInstance === lenis) lenisInstance = null; };
  }, [reduced, quality]);
  useEffect(() => {
    const hash = () => { if (location.hash) scrollToSection(location.hash, false); };
    const frame = requestAnimationFrame(hash);
    const settle = location.hash ? new ResizeObserver(hash) : null;
    const intents = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
    const release = () => {
      settle?.disconnect(); clearTimeout(timer);
      intents.forEach(type => window.removeEventListener(type, release));
    };
    const timer = window.setTimeout(release, 2500);
    if (settle) {
      settle.observe(document.body);
      intents.forEach(type => window.addEventListener(type, release, { passive: true }));
    }
    window.addEventListener('hashchange', hash);
    return () => { cancelAnimationFrame(frame); release(); window.removeEventListener('hashchange', hash); };
  }, []);
}
