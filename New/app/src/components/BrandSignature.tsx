import React, { useEffect, useRef, useState } from 'react';

const BrandSignature: React.FC<{ className?: string }> = ({ className = '' }) => {
  const textRef = useRef<SVGTextElement>(null);
  const [len, setLen] = useState(92);

  useEffect(() => {
    const measure = () => {
      if (textRef.current) {
        const w = textRef.current.getComputedTextLength();
        if (w > 0) setLen(w);
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
    <svg
      className={`brand-signature ${className}`}
      viewBox={`0 0 ${Math.ceil(len + 6)} 36`}
      preserveAspectRatio="xMinYMid meet"
      role="img"
      aria-label="Moqian"
      style={{ '--brand-len': len } as React.CSSProperties}
    >
      <text
        ref={textRef}
        x="3"
        y="26"
        fontSize="28"
        style={{ fontFamily: 'var(--font-signature)' }}
      >
        Moqian
      </text>
    </svg>
  );
};

export default React.memo(BrandSignature);
