import { useEffect, useRef, memo } from 'react';
import { useCustomCursor } from '@/hooks/useCustomCursor';
import { useIsMobile } from '@/hooks/useMediaQuery';

const CustomCursorInner = memo(function CustomCursorInner() {
  const isMobile = useIsMobile();
  const cursorRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const { setCursorElements } = useCustomCursor(!isMobile);

  useEffect(() => {
    setCursorElements(cursorRef.current, glowRef.current);
  }, [setCursorElements]);

  if (isMobile) return null;

  return (
    <>
      {/* Crosshair cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none z-[9999] opacity-0"
        style={{ willChange: 'transform' }}
      >
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect x="14" y="14" width="4" height="4" fill="#080808" />
          <line x1="16" y1="0" x2="16" y2="12" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="16" y1="20" x2="16" y2="32" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="0" y1="16" x2="12" y2="16" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="20" y1="16" x2="32" y2="16" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="12" y1="0" x2="16" y2="0" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="16" y1="0" x2="20" y2="0" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="12" y1="32" x2="16" y2="32" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="16" y1="32" x2="20" y2="32" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="0" y1="12" x2="0" y2="16" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="0" y1="16" x2="0" y2="20" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="32" y1="12" x2="32" y2="16" stroke="#E5E5E5" strokeWidth="1" />
          <line x1="32" y1="16" x2="32" y2="20" stroke="#E5E5E5" strokeWidth="1" />
          <circle cx="16" cy="16" r="1.5" fill="#E5E5E5" />
        </svg>
      </div>
      {/* Glow halo */}
      <div
        ref={glowRef}
        className="fixed top-0 left-0 pointer-events-none z-[9998] opacity-0"
        style={{
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,248,240,0.25) 0%, transparent 70%)',
          mixBlendMode: 'difference',
          filter: 'blur(20px)',
          willChange: 'transform',
        }}
      />
    </>
  );
});

export default CustomCursorInner;
