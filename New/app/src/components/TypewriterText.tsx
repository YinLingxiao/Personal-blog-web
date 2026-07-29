import React, { useState, useEffect, useRef } from 'react';
import { useReducedMotion, useIsMobile } from '@/hooks/useMediaQuery';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  enabled?: boolean;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({
  text,
  speed = 30,
  className = '',
  style,
  onComplete,
  enabled = true,
}) => {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!enabled) return;

    // Skip animation on mobile or reduced motion preference
    if (isMobile || reducedMotion) {
      setDisplayed(text);
      setDone(true);
      onComplete?.();
      return;
    }

    indexRef.current = 0;
    setDisplayed('');
    setDone(false);

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        setDone(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete?.();
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [text, speed, enabled, onComplete, isMobile, reducedMotion]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && enabled && !isMobile && !reducedMotion && (
        <span className="inline-block w-[2px] h-[1em] bg-[var(--fg)] ml-[1px] animate-pulse align-middle" />
      )}
    </span>
  );
};

export default React.memo(TypewriterText);
