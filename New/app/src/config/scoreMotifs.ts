import type { CSSProperties } from 'react';

export type ScorePiece = 'ballade' | 'opus' | 'sonata' | 'concerto' | 'etude';
export type ScoreVariant = 'section' | 'card' | 'wide';

type ScoreCorner = 'top-right' | 'bottom-left';

interface ScoreFragment {
  staff: string;
  notes: string;
  aspectRatio: string;
  reveal: 'ltr' | 'rtl';
  mask: string;
  desktop: CSSProperties;
  mobile: CSSProperties;
}

interface ScoreMotif {
  label: string;
  opacity: number;
  fragments: [ScoreFragment, ScoreFragment];
}

const MASKS: Record<ScoreCorner, string> = {
  'top-right': 'linear-gradient(to top right, transparent 0%, rgba(0, 0, 0, 0.5) 42%, black 75%)',
  'bottom-left': 'linear-gradient(to bottom left, transparent 0%, rgba(0, 0, 0, 0.5) 42%, black 75%)',
};

const fragment = (
  piece: ScorePiece,
  name: 'a' | 'b',
  corner: ScoreCorner,
  aspectRatio: string,
  desktop: CSSProperties,
  mobile: CSSProperties,
): ScoreFragment => ({
  staff: `/scores/${piece}-${name}-staff.webp`,
  notes: `/scores/${piece}-${name}-notes.webp`,
  aspectRatio,
  reveal: corner === 'top-right' ? 'rtl' : 'ltr',
  mask: MASKS[corner],
  desktop,
  mobile,
});

export const scoreMotifs: Record<ScorePiece, ScoreMotif> = {
  ballade: {
    label: 'F. CHOPIN · BALLADE NO.1 · OP.23',
    opacity: 0.16,
    fragments: [
      fragment('ballade', 'a', 'top-right', '3.588',
        { top: '-5%', right: '-7%', width: '36%' },
        { top: '-3%', right: '-14%', width: '82%' }),
      fragment('ballade', 'b', 'bottom-left', '3.763',
        { bottom: '-6%', left: '-7%', width: '36%' },
        { bottom: '-4%', left: '-14%', width: '82%' }),
    ],
  },
  opus: {
    label: 'F. LISZT · HUNGARIAN RHAPSODY NO.2 · S.244/2',
    opacity: 0.13,
    fragments: [
      fragment('opus', 'a', 'top-right', '2.735',
        { top: '-6%', right: '-7%', width: '34%' },
        { top: '-3%', right: '-14%', width: '80%' }),
      fragment('opus', 'b', 'bottom-left', '2.644',
        { bottom: '-7%', left: '-7%', width: '34%' },
        { bottom: '-5%', left: '-14%', width: '80%' }),
    ],
  },
  sonata: {
    label: 'L. V. BEETHOVEN · SONATA NO.14 · OP.27 NO.2',
    opacity: 0.15,
    fragments: [
      fragment('sonata', 'a', 'top-right', '3.509',
        { top: '-7%', right: '-10%', width: '56%' },
        { top: '-4%', right: '-16%', width: '96%' }),
      fragment('sonata', 'b', 'bottom-left', '4.131',
        { bottom: '-9%', left: '-10%', width: '56%' },
        { bottom: '-6%', left: '-16%', width: '96%' }),
    ],
  },
  concerto: {
    label: 'P. I. TCHAIKOVSKY · PIANO CONCERTO NO.1 · OP.23',
    opacity: 0.15,
    fragments: [
      fragment('concerto', 'a', 'top-right', '2.847',
        { top: '-7%', right: '-10%', width: '58%' },
        { top: '-4%', right: '-16%', width: '98%' }),
      fragment('concerto', 'b', 'bottom-left', '2.568',
        { bottom: '-9%', left: '-10%', width: '58%' },
        { bottom: '-6%', left: '-16%', width: '98%' }),
    ],
  },
  etude: {
    label: 'F. CHOPIN · ÉTUDE OP.10 NO.5 · BLACK KEYS',
    opacity: 0.15,
    fragments: [
      fragment('etude', 'a', 'top-right', '3.893',
        { top: '-8%', right: '-6%', width: '42%' },
        { top: '-4%', right: '-14%', width: '88%' }),
      fragment('etude', 'b', 'bottom-left', '4.380',
        { bottom: '-10%', left: '-6%', width: '42%' },
        { bottom: '-7%', left: '-14%', width: '88%' }),
    ],
  },
};
