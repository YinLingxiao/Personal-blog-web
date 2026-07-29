import { useState, useEffect, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
  text: string;
  speed?: number;
  enabled?: boolean;
  onComplete?: () => void;
}

export function useTypewriter({ text, speed = 30, enabled = true, onComplete }: UseTypewriterOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (!enabled) {
      setDisplayedText(text);
      setIsComplete(true);
      onComplete?.();
      return;
    }

    indexRef.current = 0;
    setDisplayedText('');
    setIsComplete(false);

    intervalRef.current = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayedText(text);
        setIsComplete(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onComplete?.();
      } else {
        setDisplayedText(text.slice(0, indexRef.current));
      }
    }, speed);
  }, [text, speed, enabled, onComplete]);

  useEffect(() => {
    if (enabled) {
      start();
    } else {
      setDisplayedText(text);
      setIsComplete(true);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled]);

  return { displayedText, isComplete, start };
}
