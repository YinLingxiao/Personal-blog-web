import React, { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '@/hooks/useMediaQuery';

interface Quote {
  text: string;
  author: string;
  italic: boolean;
  translation?: string;
}

const QUOTES: Quote[] = [
  { text: '博观而约取，厚积而薄发。', author: '苏轼', italic: false },
  { text: 'Stay Hungry, stay foolish.', author: 'Steve Jobs', italic: true, translation: '求知若饥，虚心若愚。' },
  { text: 'El camino se hace al andar.', author: 'Antonio Machado', italic: true, translation: '路，是人走出来的。' },
];

const TYPE_MS = 70;
const DELETE_MS = 32;
const HOLD_MS = 5000;
const GAP_MS = 600;

const QuoteTyper: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [count, setCount] = useState(0);
  const [authorCount, setAuthorCount] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'deleting'>('typing');

  const quote = QUOTES[quoteIndex];
  const authorStr = ` —— ${quote.author}`;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStarted(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!started || reducedMotion) return;
    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'typing') {
      if (count < quote.text.length) {
        timer = setTimeout(() => setCount((c) => c + 1), TYPE_MS);
      } else if (authorCount < authorStr.length) {
        timer = setTimeout(() => setAuthorCount((c) => c + 1), TYPE_MS);
      } else {
        timer = setTimeout(() => setPhase('deleting'), HOLD_MS);
      }
    } else {
      if (authorCount > 0) {
        timer = setTimeout(() => setAuthorCount((c) => c - 1), DELETE_MS);
      } else if (count > 0) {
        timer = setTimeout(() => setCount((c) => c - 1), DELETE_MS);
      } else {
        timer = setTimeout(() => {
          setQuoteIndex((i) => (i + 1) % QUOTES.length);
          setPhase('typing');
        }, GAP_MS);
      }
    }
    return () => clearTimeout(timer);
  }, [started, reducedMotion, phase, count, authorCount, quote.text.length, authorStr.length]);

  const shownText = reducedMotion ? QUOTES[0].text : quote.text.slice(0, count);
  const shownAuthor = reducedMotion ? ` —— ${QUOTES[0].author}` : authorStr.slice(0, authorCount);
  const activeQuote = reducedMotion ? QUOTES[0] : quote;

  return (
    <div
      ref={rootRef}
      className="quote-ide rounded"
      role="note"
      aria-label={`${activeQuote.text} —— ${activeQuote.author}${activeQuote.translation ? `，释义：${activeQuote.translation}` : ''}`}
    >
      <div className="quote-ide-bar">
        <span className="quote-ide-dot" />
        <span className="quote-ide-dot" />
        <span className="quote-ide-dot" />
        <span className="quote-ide-title">mottos.txt</span>
      </div>
      <div className="quote-ide-body" aria-hidden="true">
        <span className="quote-ide-lineno">1</span>
        <div className={`quote-line ${activeQuote.italic ? 'quote-font-italic' : 'quote-font-kai'}`}>
          <span className="quote-tip-wrap" data-translatable={activeQuote.translation ? 'true' : undefined}>
            {shownText}
            {activeQuote.translation && <span className="quote-tip">{activeQuote.translation}</span>}
          </span>
          <span className="quote-author">{shownAuthor}</span>
          <span className="quote-cursor" />
        </div>
      </div>
    </div>
  );
};

export default React.memo(QuoteTyper);
