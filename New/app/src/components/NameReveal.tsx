import { useRef, useEffect, useCallback, type MouseEvent, type PointerEvent } from 'react';
import { gsap } from 'gsap';
import { useMotionPolicy } from '@/components/motion/motion';

type NameState = 'initials' | 'pinyin' | 'meaning';

const TEXT: Record<NameState, string> = {
  initials: 'Y.I.A.',
  pinyin: 'YIN LING XIAO',
  meaning: 'Yearning. Ingenious. Astute.',
};

const STATES: NameState[] = ['initials', 'pinyin', 'meaning'];

const NameReveal = () => {
  const hostRef = useRef<HTMLSpanElement>(null);
  const stateRef = useRef<NameState>('initials');
  const lockedRef = useRef(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const holdRef = useRef<gsap.core.Tween | null>(null);
  const { reduced: reducedMotion } = useMotionPolicy();

  const morphTo = useCallback((next: NameState, onComplete?: () => void) => {
    const host = hostRef.current;
    if (!host) return;
    timelineRef.current?.kill();
    const layers = Array.from(host.querySelectorAll<HTMLElement>('[data-name-state]'));
    const incoming = layers.find(layer => layer.dataset.nameState === next);
    if (!incoming) return;
    stateRef.current = next;

    if (reducedMotion) {
      layers.forEach(layer => {
        gsap.set(layer, { autoAlpha: layer === incoming ? 1 : 0 });
        gsap.set(layer.children, { opacity: 1, x: 0, y: 0, scale: 1, filter: 'none', clipPath: 'inset(0% 0% 0% 0%)' });
      });
      onComplete?.();
      return;
    }

    const source = layers.find(layer =>
      layer !== incoming && Number(gsap.getProperty(layer, 'opacity')) > 0 &&
      Array.from(layer.querySelectorAll<HTMLElement>('.name-reveal__letter--accent'))
        .some(letter => Number(gsap.getProperty(letter, 'opacity')) > 0)
    );
    const sourceAnchors = source
      ? Array.from(source.querySelectorAll<HTMLElement>('.name-reveal__letter--accent'))
      : [];
    const origins = sourceAnchors.map(letter => {
      const rect = letter.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        fontSize: parseFloat(getComputedStyle(letter).fontSize) * Number(gsap.getProperty(letter, 'scaleX')),
      };
    });
    const outgoing = source
      ? Array.from(source.querySelectorAll<HTMLElement>('.name-reveal__letter:not(.name-reveal__letter--accent)'))
      : [];
    const outgoingPositions = outgoing.map(letter => {
      const rect = letter.getBoundingClientRect();
      const anchor = origins[Number(letter.dataset.nameGroup)];
      return Number(gsap.getProperty(letter, 'x')) + (anchor ? (anchor.x - rect.left - rect.width / 2) * 0.82 : 0);
    });

    layers.filter(layer => layer !== source && layer !== incoming).forEach(layer => gsap.set(layer, { autoAlpha: 0 }));
    const letters = Array.from(incoming.children) as HTMLElement[];
    const anchors = letters.filter(letter => letter.classList.contains('name-reveal__letter--accent'));
    const additions = letters.filter(letter => !letter.classList.contains('name-reveal__letter--accent'));
    gsap.set(incoming, { autoAlpha: 1 });
    gsap.set(letters, { opacity: 0, x: 0, y: 0, scale: 1, filter: 'none', clipPath: 'inset(0% 0% 0% 0%)' });
    const destinations = anchors.map(letter => {
      const rect = letter.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    anchors.forEach((letter, index) => {
      const origin = origins[index] || destinations[index];
      gsap.set(letter, {
        opacity: 1,
        x: origin.x - destinations[index].x,
        y: origin.y - destinations[index].y,
        scale: 'fontSize' in origin ? origin.fontSize / parseFloat(getComputedStyle(letter).fontSize) : 1,
      });
    });
    gsap.set(sourceAnchors, { opacity: 0 });

    additions.forEach(letter => {
      const group = Number(letter.dataset.nameGroup);
      const rect = letter.getBoundingClientRect();
      const origin = origins[group] || destinations[group];
      const toLeft = rect.left + rect.width / 2 < destinations[group].x;
      gsap.set(letter, {
        x: next === 'initials' ? 0 : origin.x - rect.left - rect.width / 2,
        clipPath: next === 'initials' ? 'inset(0% 0% 0% 0%)' : toLeft ? 'inset(0% 0% 0% 100%)' : 'inset(0% 100% 0% 0%)',
      });
    });

    const timeline = gsap.timeline({ onComplete });
    timelineRef.current = timeline;
    const fromInitials = source?.dataset.nameState === 'initials';
    const foldDuration = fromInitials ? 0.18 : 0.3;
    if (outgoing.length) {
      timeline.to(outgoing, {
        opacity: 0,
        x: (index: number) => fromInitials ? Number(gsap.getProperty(outgoing[index], 'x')) : outgoingPositions[index],
        duration: foldDuration,
        stagger: fromInitials ? 0 : { amount: 0.08, from: 'edges' },
        ease: 'power2.inOut',
      }, 0);
      timeline.set(source!, { autoAlpha: 0 }, foldDuration + (fromInitials ? 0 : 0.08));
    }

    const travelStart = fromInitials ? 0.22 : 0.28;
    timeline.to(anchors, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.76,
      ease: 'power3.inOut',
    }, travelStart);

    if (next === 'initials') {
      timeline.to(additions, {
        opacity: 1,
        duration: 0.22,
        stagger: 0.035,
        ease: 'sine.out',
      }, travelStart + 0.76);
    } else {
      additions.forEach(letter => {
        const group = Number(letter.dataset.nameGroup);
        const distance = Math.abs(letters.indexOf(letter) - letters.indexOf(anchors[group]));
        const punctuation = letter.textContent === '.';
        timeline.to(letter, {
          opacity: 1,
          x: 0,
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: punctuation ? 0.24 : 0.65,
          ease: punctuation ? 'sine.out' : 'power3.inOut',
        }, punctuation ? travelStart + 0.84 : travelStart + 0.13 + Math.min(distance * 0.035, 0.21));
      });
    }
  }, [reducedMotion]);

  const runReveal = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    holdRef.current?.kill();
    morphTo('meaning', () => {
      holdRef.current = gsap.delayedCall(3, () => {
        morphTo('initials', () => { lockedRef.current = false; });
      });
    });
  }, [morphTo]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    stateRef.current = 'initials';
    lockedRef.current = false;
    host.querySelectorAll<HTMLElement>('[data-name-state]').forEach(layer => {
      gsap.set(layer, { autoAlpha: layer.dataset.nameState === 'initials' ? 1 : 0 });
      gsap.set(layer.children, { opacity: 1, x: 0, y: 0, scale: 1, filter: 'none', clipPath: 'inset(0% 0% 0% 0%)' });
    });
    return () => {
      timelineRef.current?.kill();
      holdRef.current?.kill();
    };
  }, [reducedMotion]);

  const showPinyin = () => {
    if (!lockedRef.current && stateRef.current !== 'pinyin') morphTo('pinyin');
  };

  const showInitials = () => {
    if (!lockedRef.current && stateRef.current !== 'initials') morphTo('initials');
  };

  const handlePointerEnter = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') showPinyin();
  };

  const handlePointerLeave = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse') showInitials();
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (lockedRef.current) return;
    if (event.detail === 0 || window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      runReveal();
    } else if (stateRef.current === 'initials') {
      morphTo('pinyin');
    } else {
      runReveal();
    }
  };

  return (
    <button
      type="button"
      aria-label="Y.I.A.（尹凌霄）— Yearning. Ingenious. Astute. 点击展开名字含义"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) showPinyin(); }}
      onBlur={showInitials}
      onClick={handleClick}
      className="name-reveal bg-transparent cursor-pointer"
    >
      <span ref={hostRef} aria-hidden="true" className="name-reveal__stage">
        {STATES.map(state => (
          <span key={state} data-name-state={state} className={`name-reveal__text name-reveal__text--${state}`}>
            {Array.from(TEXT[state]).map((letter, index) => {
              const accent = state === 'initials'
                ? /[YIA]/.test(letter)
                : state === 'pinyin'
                  ? [0, 5, 11].includes(index)
                  : index === 0 || TEXT[state][index - 1] === ' ';
              return (
                <span key={index} data-name-group={state === 'initials' ? Math.floor(index / 2) : TEXT[state].slice(0, index).split(' ').length - 1} className={accent ? 'name-reveal__letter name-reveal__letter--accent' : 'name-reveal__letter'}>
                  {letter}
                </span>
              );
            })}
          </span>
        ))}
      </span>
    </button>
  );
};

export default NameReveal;

