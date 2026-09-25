import React, { useState, useEffect } from 'react';
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
  const [typing, setTyping] = useState({ text, progress: 0 });
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const skipAnimation = isMobile || reducedMotion;
  const progress = typing.text === text ? typing.progress : 0;
  const done = skipAnimation || progress >= text.length;
  const displayed = skipAnimation ? text : text.slice(0, progress);

  useEffect(() => {
    if (!enabled || skipAnimation || text.length === 0) return;

    let index = 0;
    const interval = setInterval(() => {
      index = Math.min(index + 1, text.length);
      setTyping({ text, progress: index });
      if (index === text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, enabled, skipAnimation]);

  useEffect(() => {
    if (enabled && done) onComplete?.();
  }, [enabled, done, onComplete]);

  return (
    <span className={className} style={style}>
      {displayed}
      {!done && enabled && (
        <span className="inline-block w-[2px] h-[1em] bg-[var(--fg)] ml-[1px] animate-pulse align-middle" />
      )}
    </span>
  );
};

export default React.memo(TypewriterText);
