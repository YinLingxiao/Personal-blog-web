import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;

export function scrollToSection(target: string | number) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, { duration: 1.2 });
    return;
  }
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: 'smooth' });
  } else {
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  }
}

export function stopScroll() {
  lenisInstance?.stop();
}

export function startScroll() {
  lenisInstance?.start();
}

export function useSmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
    });

    lenisRef.current = lenis;
    lenisInstance = lenis;

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);

    // 使用命名回调引用：GSAP ticker 要求 add/remove 传入同一个函数对象，
    // 匿名箭头函数或 lenis.raf 都指向不同引用，会导致组件卸载后仍然逐帧执行。
    const updateLenis = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    return () => {
      // 必须移除同一个引用，否则 ticker 中会一直残留已 destroy 的 Lenis 回调。
      gsap.ticker.remove(updateLenis);
      lenis.destroy();
      lenisRef.current = null;
      lenisInstance = null;
    };
  }, []);

  return lenisRef;
}
