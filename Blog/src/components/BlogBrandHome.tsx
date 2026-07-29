import { useEffect, useRef, useState } from 'react';
import { headerConfig } from '@/config';

export default function BlogBrandHome() {
  const textRef = useRef<SVGTextElement>(null);
  const [len, setLen] = useState(92);

  useEffect(() => {
    const measure = () => {
      if (textRef.current) {
        const width = textRef.current.getComputedTextLength();
        if (width > 0) setLen(width);
      }
    };
    if (document.fonts) {
      document.fonts.load('28px "Great Vibes"', 'Moqian').then(measure).catch(() => undefined);
      document.fonts.ready.then(measure).catch(() => undefined);
    } else {
      measure();
    }
  }, []);

  return (
    <a href={headerConfig.homeUrl} className="brand-home block h-9" aria-label="返回网站主页">
      <svg
        className="blog-brand block h-9 w-auto"
        viewBox={`0 0 ${Math.ceil(len + 6)} 36`}
        preserveAspectRatio="xMinYMid meet"
        style={{ '--brand-len': len } as React.CSSProperties}
        aria-hidden="true"
      >
        <text ref={textRef} x="3" y="26" fontSize="28" style={{ fontFamily: 'var(--font-brand)' }}>
          Moqian
        </text>
      </svg>
    </a>
  );
}
