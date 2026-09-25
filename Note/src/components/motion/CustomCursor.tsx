import { useEffect, useRef } from 'react';
import { useMotionPolicy } from './motion';
import './motion.css';

export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const { reduced } = useMotionPolicy();
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced || !matchMedia('(pointer: fine)').matches) return;
    const move = (e: PointerEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      const interactive = !!target?.closest('a,button,[role=button]');
      const text = !!target?.closest('input,textarea,[contenteditable],p,h1,h2,h3');
      el.dataset.active = String(interactive);
      el.style.opacity = text || e.pointerType === 'touch' ? '0' : '.65';
      el.style.transform = `translate3d(${e.clientX + 12}px,${e.clientY + 12}px,0)`;
    };
    const leave = () => { el.style.opacity = '0'; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.removeEventListener('blur', leave);
      leave();
    };
  }, [reduced]);
  return <div ref={ref} className="precise-cursor" aria-hidden="true" />;
}
