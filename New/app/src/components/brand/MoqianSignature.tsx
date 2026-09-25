import { memo, useEffect, useRef } from 'react';
import { WORDMARK_PATH } from './wordmark-path';
import './signature.css';

function MoqianSignature({ className = '', entranceDelay = 0 }: { className?: string; entranceDelay?: number }) {
  const rootRef = useRef<SVGSVGElement>(null);
  const inkRef = useRef<SVGGElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const ink = inkRef.current;
    const stroke = strokeRef.current;
    if (!root || !ink || !stroke) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const trigger = root.closest('a, button') ?? root;
    const lockup = root.closest<HTMLElement>('[data-brand-lockup]');
    let animations: Animation[] = [];
    const settle = () => {
      animations.forEach(animation => animation.cancel());
      animations = [];
    };
    const write = (delay = 0) => {
      if ((motion.matches || document.documentElement.dataset.motion === 'reduced') || animations.some(animation => animation.playState === 'running' || animation.pending)) return;
      settle();
      const timing = { duration: 1650, delay, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'backwards' as const };
      animations = [
        ink.animate([
          { clipPath: 'inset(-4% 100% -4% -4%)', opacity: 0.45 },
          { clipPath: 'inset(-4% -4% -4% -4%)', opacity: 1 },
        ], timing),
        stroke.animate([
          { strokeDashoffset: 1, opacity: 0.6 },
          { strokeDashoffset: 0, opacity: 0.7, offset: 0.78 },
          { strokeDashoffset: 0, opacity: 0 },
        ], timing),
      ];
    };
    const onPointerEnter = (event: Event) => {
      if ((event as PointerEvent).pointerType !== 'touch') write();
    };
    const onMotionChange = () => {
      if ((motion.matches || document.documentElement.dataset.motion === 'reduced')) settle();
    };
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        write(entranceDelay);
        observer.disconnect();
      }
    }, lockup ? { rootMargin: '0px 0px -12% 0px' } : { threshold: 0.5 });
    observer.observe(lockup ?? root);
    const onFocus = () => write();
    root.addEventListener('pointerenter', onPointerEnter);
    trigger.addEventListener('focusin', onFocus);
    motion.addEventListener('change', onMotionChange);
    window.addEventListener('moqian:motion-applied', onMotionChange);

    return () => {
      observer.disconnect();
      root.removeEventListener('pointerenter', onPointerEnter);
      trigger.removeEventListener('focusin', onFocus);
      motion.removeEventListener('change', onMotionChange);
      window.removeEventListener('moqian:motion-applied', onMotionChange);
      settle();
    };
  }, [entranceDelay]);

  return (
    <svg ref={rootRef} className={`moqian-signature ${className}`} viewBox="0 0 544 194" role="img" aria-label="Moqian" focusable="false">
      <path d={WORDMARK_PATH} fill="currentColor" fillRule="evenodd" opacity="0.12" />
      <g ref={inkRef} className="moqian-signature__ink">
        <path d={WORDMARK_PATH} fill="currentColor" fillRule="evenodd" />
      </g>
      <path ref={strokeRef} className="moqian-signature__stroke" d={WORDMARK_PATH} pathLength="1" fill="none" stroke="currentColor" strokeWidth="0.85" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset="1" opacity="0" />
    </svg>
  );
}

export default memo(MoqianSignature);
