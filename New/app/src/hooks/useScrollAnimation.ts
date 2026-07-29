import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

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

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const {
      animation = 'fadeUp',
      delay = 0,
      duration = 1.0,
      y = 30,
      stagger = 0.15,
      triggerStart = 'top bottom-=10%',
      childSelector,
    } = options;

    const targets = childSelector ? el.querySelectorAll(childSelector) : el;

    let tween: gsap.core.Tween | gsap.core.Timeline;

    switch (animation) {
      case 'fadeUp':
        gsap.set(targets, { opacity: 0, y });
        tween = gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      case 'fadeUpDelayed':
        gsap.set(targets, { opacity: 0, y });
        tween = gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration,
          delay: delay + 0.3,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      case 'blurReveal':
        gsap.set(targets, { opacity: 0, filter: 'blur(10px)' });
        tween = gsap.to(targets, {
          opacity: 1,
          filter: 'blur(0px)',
          duration: 1.2,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      case 'slowRise':
        gsap.set(targets, { opacity: 0, y: 60 });
        tween = gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 2.0,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      case 'badgePop':
        gsap.set(targets, { opacity: 0, scale: 0 });
        tween = gsap.to(targets, {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          delay,
          ease: 'back.out(1.7)',
          stagger,
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      case 'stagger':
        gsap.set(targets, { opacity: 0, y });
        tween = gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration,
          delay,
          ease: 'power3.out',
          stagger,
          scrollTrigger: {
            trigger: el,
            start: triggerStart,
            toggleActions: 'play none none none',
          },
        });
        break;

      default:
        return;
    }

    return () => {
      if (tween) tween.kill();
      ScrollTrigger.getAll().forEach(st => {
        if (st.trigger === el) st.kill();
      });
    };
  }, []);

  return ref;
}
