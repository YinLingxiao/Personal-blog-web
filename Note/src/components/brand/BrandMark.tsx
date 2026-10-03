import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { BRAND_MARK } from './brandMarkPaths';
import './BrandMark.css';

type BrandMarkProps = {
  className?: string;
  style?: CSSProperties;
  autoplay?: boolean;
  playSignal?: number;
};

function BrandMark({ className = '', style, autoplay = true, playSignal = 0 }: BrandMarkProps) {
  const rootRef = useRef<SVGSVGElement>(null);
  const playRef = useRef<() => void>(() => {});
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
      if (motion.matches || document.documentElement.dataset.motion === 'reduced') return;
      if (animations.some(animation => animation.playState === 'running' || animation.pending)) return;
      settle();
      const timing = { easing: 'cubic-bezier(.22, 1, .36, 1)', fill: (autoplay ? 'backwards' : 'both') as FillMode };
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
    playRef.current = play;
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
    if (autoplay) observer.observe(lockup ?? root);
    if (autoplay) {
      root.addEventListener('pointerenter', onPointerEnter);
      trigger.addEventListener('focusin', play);
    }
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('moqian:motion-applied', onMotionChange);

    return () => {
      observer.disconnect();
      root.removeEventListener('pointerenter', onPointerEnter);
      trigger.removeEventListener('focusin', play);
      playRef.current = () => {};
      motion.removeEventListener('change', onMotionChange);
      window.removeEventListener('moqian:motion-applied', onMotionChange);
      settle();
    };
  }, [autoplay]);

  useEffect(() => {
    if (!playSignal) return;
    playRef.current();
  }, [playSignal]);

  return (
    <svg ref={rootRef} className={`brand-mark ${className}`} viewBox={`0 0 ${BRAND_MARK.width} ${BRAND_MARK.height}`} fill="currentColor" aria-hidden="true" focusable="false" style={style}>
      <path ref={rayRef} className="brand-mark__ray" d={BRAND_MARK.ray} />
      <path ref={starRef} className="brand-mark__star" d={BRAND_MARK.star} />
      <path ref={moonRef} className="brand-mark__moon" d={BRAND_MARK.moon} />
    </svg>
  );
}

export default memo(BrandMark);
