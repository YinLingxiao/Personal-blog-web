import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scoreMotifs, type ScorePiece, type ScoreVariant } from '@/config/scoreMotifs';
import { useIsMobile } from '@/hooks/useMediaQuery';

gsap.registerPlugin(ScrollTrigger);

interface ScoreSilhouetteProps {
  piece: ScorePiece;
  variant: ScoreVariant;
  className?: string;
}

const CLIP_VISIBLE = 'inset(0% 0% 0% 0%)';
const CLIP_HIDDEN_LTR = 'inset(0% 100% 0% 0%)';
const CLIP_HIDDEN_RTL = 'inset(0% 0% 0% 100%)';

const ScoreSilhouette: React.FC<ScoreSilhouetteProps> = ({ piece, variant, className = '' }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const motif = scoreMotifs[piece];

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const staffLayers = root.querySelectorAll<HTMLElement>('[data-score-staff]');
    const noteLayers = root.querySelectorAll<HTMLElement>('[data-score-notes]');

    if (reducedMotion) {
      gsap.set(staffLayers, { clipPath: CLIP_VISIBLE });
      gsap.set(noteLayers, { opacity: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: 'top 78%',
          once: true,
        },
      });

      staffLayers.forEach((staff, index) => {
        const hiddenClip = motif.fragments[index].reveal === 'rtl' ? CLIP_HIDDEN_RTL : CLIP_HIDDEN_LTR;
        const start = index * 0.25;
        timeline.fromTo(staff, { clipPath: hiddenClip }, { clipPath: CLIP_VISIBLE, duration: 1, ease: 'power2.out' }, start);
        timeline.fromTo(noteLayers[index], { opacity: 0, y: isMobile ? 0 : 8 }, { opacity: 1, y: 0, duration: 0.75, ease: 'power2.out' }, start + 0.15);
      });
    }, root);

    return () => context.revert();
  }, [isMobile, piece, motif]);

  return (
    <div
      ref={rootRef}
      className={`score-silhouette score-silhouette--${variant} ${className}`}
      aria-hidden="true"
    >
      {motif.fragments.map((item) => (
        <div
          key={item.staff}
          className="score-fragment"
          style={{
            ...(isMobile ? item.mobile : item.desktop),
            aspectRatio: item.aspectRatio,
            opacity: motif.opacity,
            '--score-mask': item.mask,
          } as React.CSSProperties}
        >
          <img data-score-staff src={item.staff} alt="" loading="lazy" decoding="async" />
          <img data-score-notes src={item.notes} alt="" loading="lazy" decoding="async" />
        </div>
      ))}
      <span className="score-label">{motif.label}</span>
    </div>
  );
};

export default React.memo(ScoreSilhouette);
