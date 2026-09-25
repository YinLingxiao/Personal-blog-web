import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import './BrandMark.css';

type BrandMarkProps = {
  className?: string;
  style?: CSSProperties;
};

function BrandMark({ className = '', style }: BrandMarkProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const moonRef = useRef<SVGPathElement>(null);
  const starRef = useRef<SVGPathElement>(null);
  const rayRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const moon = moonRef.current;
    const star = starRef.current;
    const ray = rayRef.current;
    if (!root || !moon || !star || !ray || typeof moon.animate !== 'function') return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const trigger = root.closest('a, button') ?? root;
    const lockup = root.closest<HTMLElement>('[data-brand-lockup]');
    let animations: Animation[] = [];
    const settle = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    const play = () => {
      if ((motion.matches || document.documentElement.dataset.motion === 'reduced') || animations.some(animation => animation.playState === 'running' || animation.pending)) return;
      settle();
      const timing = { easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' as const };
      animations = [
        moon.animate([
          { transform: 'translateY(4px) rotate(3deg)', opacity: 0.35 },
          { transform: 'translateY(0px) rotate(0deg)', opacity: 1 },
        ], { ...timing, duration: 650 }),
        star.animate([
          { transform: 'translateY(4px) scale(.96)', opacity: 0.28 },
          { transform: 'translateY(0px) scale(1)', opacity: 1 },
        ], { ...timing, delay: 260, duration: 800 }),
        ray.animate([
          { transform: 'translateY(4px)', opacity: 0.12 },
          { transform: 'translateY(-2px)', opacity: 1, offset: 0.65 },
          { transform: 'translateY(0px)', opacity: 1 },
        ], { ...timing, delay: 620, duration: 1030 }),
      ];
    };
    const onPointerEnter = (event: Event) => {
      if ((event as PointerEvent).pointerType !== 'touch') play();
    };
    const onMotionChange = () => {
      if ((motion.matches || document.documentElement.dataset.motion === 'reduced')) settle();
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        play();
        observer.disconnect();
      }
    }, lockup ? { rootMargin: '0px 0px -12% 0px' } : { threshold: 0.5 });
    observer.observe(lockup ?? root);
    root.addEventListener('pointerenter', onPointerEnter);
    trigger.addEventListener('focusin', play);
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('moqian:motion-applied', onMotionChange);

    return () => {
      observer.disconnect();
      root.removeEventListener('pointerenter', onPointerEnter);
      trigger.removeEventListener('focusin', play);
      motion.removeEventListener('change', onMotionChange);
      window.removeEventListener('moqian:motion-applied', onMotionChange);
      settle();
    };
  }, []);

  return (
    <svg ref={rootRef} className={`brand-mark ${className}`} viewBox="0 0 100 144" fill="currentColor" aria-hidden="true" focusable="false" style={style}>
      <path ref={rayRef} className="brand-mark__ray" d="M45 4C42 28 29 45 6 56C24 53 38 37 45 22C52 37 67 52 82 56C60 43 49 28 45 4Z" />
      <path ref={starRef} className="brand-mark__star" d="M44 34C41 61 33 70 5 73C34 77 41 87 44 118C47 87 54 77 80 73C54 70 47 61 44 34Z" />
      <path ref={moonRef} className="brand-mark__moon" d="M84 50C106 79 96 120 66 135C39 148 13 134 5 109C19 133 52 135 72 109C87 90 92 69 84 50Z" />
    </svg>
  );
}

export default memo(BrandMark);
