import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useMotionPolicy } from '@/components/motion/motion';

gsap.registerPlugin(ScrollTrigger);
interface ScrollAnimationOptions {
  animation?: 'fadeUp' | 'fadeUpDelayed' | 'blurReveal' | 'slowRise' | 'badgePop' | 'stagger';
  delay?: number;
  duration?: number;
  y?: number;
  stagger?: number;
  triggerStart?: string;
  childSelector?: string;
}
export function useScrollAnimation<T extends HTMLElement>(options: ScrollAnimationOptions = {}) {
  const ref = useRef<T>(null);
  const { reduced } = useMotionPolicy();
  const { animation = 'fadeUp', delay = 0, duration = .7, y = 16, stagger = .08, triggerStart = 'top 94%', childSelector } = options;
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;
    const context = gsap.context(() => {
      const targets = childSelector ? el.querySelectorAll(childSelector) : el;
      gsap.fromTo(targets, { y: animation === 'blurReveal' ? 0 : Math.min(y, 20), opacity: 1 }, {
        y: 0, opacity: 1, duration: Math.min(duration, .8), delay: Math.min(delay, .15),
        stagger: animation === 'stagger' ? stagger : 0, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: triggerStart, once: true },
      });
    }, el);
    return () => context.revert();
  }, [reduced, animation, delay, duration, y, stagger, triggerStart, childSelector]);
  return ref;
}
