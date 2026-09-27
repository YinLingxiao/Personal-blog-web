import { useEffect, useRef, useCallback } from 'react';

interface CursorState {
  x: number;
  y: number;
  visible: boolean;
}

export function useCustomCursor(enabled: boolean) {
  const cursorRef = useRef<CursorState>({ x: 0, y: 0, visible: false });
  const glowRef = useRef<CursorState>({ x: 0, y: 0, visible: false });
  const rafRef = useRef<number>(0);
  const cursorElRef = useRef<HTMLDivElement | null>(null);
  const glowElRef = useRef<HTMLDivElement | null>(null);

  const setCursorElements = useCallback((cursor: HTMLDivElement | null, glow: HTMLDivElement | null) => {
    cursorElRef.current = cursor;
    glowElRef.current = glow;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let moving = false;
    const paint = () => {
      const glow = glowRef.current;
      const cursor = cursorRef.current;
      glow.x = lerp(glow.x, cursor.x, 0.15);
      glow.y = lerp(glow.y, cursor.y, 0.15);
      if (cursorElRef.current) {
        cursorElRef.current.style.transform = `translate3d(${cursor.x - 16}px, ${cursor.y - 16}px, 0)`;
        cursorElRef.current.style.opacity = cursor.visible ? '1' : '0';
      }
      if (glowElRef.current) {
        glowElRef.current.style.transform = `translate3d(${glow.x - 100}px, ${glow.y - 100}px, 0)`;
        glowElRef.current.style.opacity = glow.visible ? '1' : '0';
      }
      const dx = glow.x - cursor.x;
      const dy = glow.y - cursor.y;
      const settled = !moving && dx * dx + dy * dy < 0.25;
      moving = false;
      rafRef.current = settled ? 0 : requestAnimationFrame(paint);
    };
    const kick = () => {
      moving = true;
      if (!rafRef.current) rafRef.current = requestAnimationFrame(paint);
    };

    const onMove = (e: PointerEvent) => {
      cursorRef.current.x = e.clientX;
      cursorRef.current.y = e.clientY;
      cursorRef.current.visible = true;

      if (!glowRef.current.visible) {
        glowRef.current.x = e.clientX;
        glowRef.current.y = e.clientY;
        glowRef.current.visible = true;
      }
      kick();
    };

    const onLeave = () => {
      cursorRef.current.visible = false;
      glowRef.current.visible = false;
      kick();
    };

    const onEnter = () => {
      cursorRef.current.visible = true;
    };

    const onOver = (e: PointerEvent) => {
      const interactive = (e.target as HTMLElement | null)?.closest(
        'a, button, [role="button"], .quote-tip-wrap',
      );
      cursorElRef.current?.classList.toggle('cursor--active', Boolean(interactive));
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerover', onOver);
    document.addEventListener('mouseleave', onLeave);
    document.addEventListener('mouseenter', onEnter);

    return () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('mouseleave', onLeave);
      document.removeEventListener('mouseenter', onEnter);
      cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  return { setCursorElements };
}
