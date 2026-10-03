import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AsciiMoon from '@/components/AsciiMoon';
import BrandMark from '@/components/brand/BrandMark';
import StaticGalaxy from '@/components/StaticGalaxy';
import StaticMark from '@/components/StaticMark';
import { useMotionPolicy } from '@/components/motion/motion';
import { scrollToSection } from '@/hooks/useSmoothScroll';
import type { MoonScene } from '@/graphics/livingMoon';

const STAGES = [
  { key: 'galaxy', label: '星河', zh: '星河缓行，归于月华', en: 'The galaxy drifts, returning to moonlight.' },
  { key: 'moon', label: '月相', zh: '月光落下，序曲将起', en: 'Moonlight gathers; the prelude begins.' },
  { key: 'mark', label: '星月成印', zh: '星月成印', en: 'Moon and star, set as a seal.' },
] as const;
const TRANSITION_MS = 950;
gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const root = useRef<HTMLElement>(null), art = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoonScene | undefined>(undefined);
  const phaseRef = useRef(0), visualRef = useRef(0), animationRef = useRef(0), lockedUntil = useRef(0), solidRef = useRef(false);
  const wheelTime = useRef(0), wheelSum = useRef(0), touchStart = useRef<{ x: number; y: number } | null>(null), swiped = useRef(false);
  const [phase, setPhase] = useState(0), [ready, setReady] = useState(false), [fallback, setFallback] = useState(false), [solid, setSolid] = useState(false), [logoPlay, setLogoPlay] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const arrivalRef = useRef<boolean | undefined>(undefined);
  const { reduced, quality } = useMotionPolicy();

  const renderProgress = useCallback((value: number) => sceneRef.current?.scroll(Math.max(0, Math.min(1, value - 1)), Math.max(0, Math.min(1, value))), []);
  const goTo = useCallback((next: number) => {
    const index = Math.max(0, Math.min(2, next));
    if (index === phaseRef.current || (!reduced && performance.now() < lockedUntil.current)) return;
    phaseRef.current = index;
    setPhase(index);
    if (index !== 2) { solidRef.current = false; setSolid(false); }
    setAnnouncement(`已切换至${STAGES[index].label}`);
    sceneRef.current?.galaxy(index === 0);
    cancelAnimationFrame(animationRef.current);
    const from = visualRef.current, start = performance.now();
    const duration = reduced ? 0 : index === 2 || from > 1.02 ? 1460 : TRANSITION_MS;
    root.current?.style.setProperty('--scene-transition', `${duration}ms`);
    lockedUntil.current = reduced ? 0 : start + duration + 180;
    if (reduced) { visualRef.current = index; renderProgress(index); return; }
    const tick = (time: number) => {
      const t = duration ? Math.min(1, (time - start) / duration) : 1;
      visualRef.current = from + (index - from) * (t * t * (3 - 2 * t));
      renderProgress(visualRef.current);
      if (t < 1) animationRef.current = requestAnimationFrame(tick);
      else if (index === 2) { solidRef.current = true; setSolid(true); setLogoPlay(n => n + 1); }
    };
    animationRef.current = requestAnimationFrame(tick);
  }, [reduced, renderProgress]);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section) return;
    if (arrivalRef.current === undefined) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
      let play = !reduced && !location.hash && window.scrollY < 8 && navigation?.type !== 'back_forward';
      try {
        play = play && sessionStorage.getItem('moqian-prelude-arrived') !== 'true';
        sessionStorage.setItem('moqian-prelude-arrived', 'true');
      } catch { void 0; }
      arrivalRef.current = play;
    }
    if (reduced) { arrivalRef.current = false; return; }
    if (!arrivalRef.current) return;
    const mobile = quality !== 'desktop';
    let timeline: gsap.core.Timeline;
    const context = gsap.context(() => {
      timeline = gsap.timeline({ onComplete: () => { arrivalRef.current = false; } });
      timeline.fromTo('.prelude-title-glyph', {
        opacity: .2, clipPath: 'inset(0 0 100% 0)', filter: `blur(${mobile ? 1 : 3}px)`,
      }, {
        opacity: 1, clipPath: 'inset(0 0 0% 0)', filter: 'blur(0px)',
        duration: mobile ? .42 : .9, stagger: mobile ? .08 : .12, ease: 'power2.out',
      }, 0);
      timeline.fromTo('.prelude-kicker, .prelude-intro, .prelude-link', {
        y: 8, opacity: .35,
      }, {
        y: 0, opacity: 1, duration: mobile ? .32 : .5,
        stagger: mobile ? .08 : .14, ease: 'power3.out',
      }, mobile ? .22 : .7);
    }, section);
    const settle = () => { if (window.scrollY >= 8 || location.hash) timeline.progress(1); };
    const frame = requestAnimationFrame(settle);
    window.addEventListener('scroll', settle, { passive: true });
    window.addEventListener('hashchange', settle);
    const focus = () => timeline.progress(1);
    section.addEventListener('focusin', focus);
    return () => {
      cancelAnimationFrame(frame); context.revert();
      window.removeEventListener('scroll', settle); window.removeEventListener('hashchange', settle);
      section.removeEventListener('focusin', focus);
    };
  }, [reduced, quality]);

  useLayoutEffect(() => {
    const section = root.current;
    if (!section || reduced || quality !== 'desktop') return;
    const context = gsap.context(() => {
      const timeline = gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: 'bottom center', scrub: true, invalidateOnRefresh: true } })
        .to('.prelude-copy', { y: -20, ease: 'none' }, 0)
        .to('.moon-stage', { scale: .96, ease: 'none' }, 0)
        .to('.prelude-light', { opacity: 0, ease: 'none' }, 0)
        .fromTo('.prelude-baseline-rule', { scaleX: 0 }, { scaleX: 1, ease: 'none' }, 0);
      timeline.scrollTrigger?.refresh();
    }, section);
    return () => context.revert();
  }, [reduced, quality]);

  useLayoutEffect(() => {
    const artwork = art.current;
    if (!artwork || reduced) return;
    artwork.dataset.loading = 'true';
    return () => { delete artwork.dataset.loading; };
  }, [reduced]);

  useEffect(() => {
    const surface = stage.current;
    if (!surface) return;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      event.preventDefault();
      event.stopPropagation();
      const now = performance.now();
      if (now < lockedUntil.current) return;
      wheelSum.current = now - wheelTime.current > 170 || Math.sign(wheelSum.current) !== Math.sign(event.deltaY) ? 0 : wheelSum.current;
      wheelTime.current = now;
      wheelSum.current += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(wheelSum.current) < 28) return;
      const direction = Math.sign(wheelSum.current);
      wheelSum.current = 0;
      const before = phaseRef.current;
      goTo(before + direction);
      if (phaseRef.current === before) lockedUntil.current = now + 220;
    };
    surface.addEventListener('wheel', wheel, { passive: false, capture: true });
    return () => surface.removeEventListener('wheel', wheel, true);
  }, [goTo]);

  useEffect(() => {
    const section = root.current, container = host.current, artwork = art.current, surface = stage.current;
    if (!section || !container || !artwork || !surface) return;
    let scene: MoonScene | undefined, disposed = false, visible = true;
    if (reduced) {
      delete artwork.dataset.loading;
      visualRef.current = phaseRef.current; lockedUntil.current = 0;
      return;
    }
    const pause = () => scene?.pause(document.hidden || !visible);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; pause(); });
    observer.observe(section);
    const resize = new ResizeObserver(() => scene?.resize()); resize.observe(container);
    document.addEventListener('visibilitychange', pause);
    const fail = () => {
      if (disposed) return;
      delete artwork.dataset.loading; delete artwork.dataset.ready;
      artwork.dataset.fallback = 'true'; setFallback(true); sceneRef.current = undefined;
    };
    const frame = requestAnimationFrame(() => {
      import('@/graphics/livingMoon').then(({ createMoon }) => {
        if (disposed) return;
        let arrival = !location.hash && window.scrollY < 8;
        try { arrival = arrival && sessionStorage.getItem('moqian-moon-arrived') !== 'true'; sessionStorage.setItem('moqian-moon-arrived', 'true'); } catch { void 0; }
        artwork.dataset.arrival = String(arrival);
        try {
          scene = createMoon(container, { mobile: quality !== 'desktop', arrival, galaxy: phaseRef.current === 0, surface,
            onReady: () => {
              delete artwork.dataset.loading; artwork.dataset.ready = 'true'; setReady(true); setFallback(false);
              if (phaseRef.current === 2 && visualRef.current === 2) { solidRef.current = true; setSolid(true); setLogoPlay(n => n + 1); }
            },
            onFallback: () => { fail(); scene?.dispose(); },
          });
          sceneRef.current = scene; scene.galaxy(phaseRef.current === 0); renderProgress(visualRef.current); pause();
        } catch { fail(); }
      }).catch(fail);
    });
    return () => {
      disposed = true; cancelAnimationFrame(frame); cancelAnimationFrame(animationRef.current);
      visualRef.current = phaseRef.current; lockedUntil.current = 0;
      scene?.dispose(); sceneRef.current = undefined; observer.disconnect(); resize.disconnect();
      document.removeEventListener('visibilitychange', pause);
      delete artwork.dataset.ready; delete artwork.dataset.fallback; delete artwork.dataset.arrival;
    };
  }, [reduced, quality, renderProgress]);

  const mode = STAGES[phase].key;
  return <section id="prelude" ref={root} className="living-prelude" data-scene={mode}>
    <div className="prelude-light" aria-hidden="true"><div className="prelude-light-field" /></div>
    <div className="prelude-heading"><span>00 / Prelude</span><span>墨浅 · A living score</span></div>
    <div className="prelude-composition">
      <div className="prelude-copy">
        <p className="prelude-kicker">·安静的角落，文字的栖息地·</p>
        <h1 aria-label="墨浅"><span className="prelude-title-glyph" aria-hidden="true">墨</span><span className="prelude-title-glyph" aria-hidden="true">浅</span></h1>
        <p className="prelude-intro">在这里，我把内心书写，将创意编织。</p>
        <a className="prelude-link" href="#ballade" onClick={e => {
          if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault(); scrollToSection('#ballade');
        }}>序幕之后，是正曲 <span aria-hidden="true">→</span></a>
      </div>
      <div ref={art} className="moon-art" data-mode={mode} data-static={reduced || fallback} data-solid={!reduced && !fallback && solid}>
        <div ref={stage} className="moon-stage" tabIndex={0} role="group" aria-label="星月动画，点击循环切换，或使用上下方向键切换阶段"
          onPointerEnter={event => {
            if (event.pointerType === 'touch' || !solidRef.current) return;
            setLogoPlay(n => n + 1);
          }}
          onClick={() => {
            if (swiped.current) { swiped.current = false; return; }
            if (performance.now() < lockedUntil.current) return;
            goTo((phaseRef.current + 1) % 3);
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); goTo((phaseRef.current + 1) % 3); }
            if (event.key === 'ArrowDown' || event.key === 'PageDown') { event.preventDefault(); goTo(phaseRef.current + 1); }
            if (event.key === 'ArrowUp' || event.key === 'PageUp') { event.preventDefault(); goTo(phaseRef.current - 1); }
          }}
          onTouchStart={event => { swiped.current = false; touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }}
          onTouchCancel={() => { touchStart.current = null; swiped.current = false; }}
          onTouchEnd={event => {
            const start = touchStart.current;
            if (!start) return;
            const dx = event.changedTouches[0].clientX - start.x, dy = event.changedTouches[0].clientY - start.y;
            if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped.current = true; goTo(phaseRef.current + (dx < 0 ? 1 : -1)); }
            touchStart.current = null;
          }}>
          <div className="moon-visual" aria-hidden="true">
            <svg className="moon-orbits" viewBox="0 0 600 600"><circle cx="300" cy="300" r="250"/><path d="M30 300H68M532 300H570M300 30V68M300 532V570"/><circle cx="300" cy="300" r="205" strokeDasharray="1 15"/></svg>
            <div className="moon-fallback"><div className="fallback-moon"><AsciiMoon /></div><StaticGalaxy className="fallback-galaxy" /><StaticMark className="fallback-mark" /></div>
            <div ref={host} className="moon-canvas" />
            <BrandMark className="seal-logo" autoplay={false} playSignal={logoPlay} />
          </div>
        </div>
        <p className="moon-caption">{STAGES.map((item, index) => <span key={item.key} data-active={index === phase} aria-hidden={index !== phase}>
          <span lang="zh-CN">{item.zh}</span><span lang="en">{item.en}</span>
        </span>)}</p>
        <div className="moon-index" role="group" aria-label="选择星月乐章" style={{ '--active-stage': phase } as CSSProperties}>
          <span className="moon-index-rule" aria-hidden="true" />
          {STAGES.map((item, index) => <button key={item.key} type="button" aria-pressed={index === phase} aria-label={`切换至${item.label}`} onClick={() => goTo(index)}>
            <span className="moon-index-number" aria-hidden="true">0{index + 1}</span>{index === 2 ? '成印' : item.label}
          </button>)}
        </div>
      </div>
    </div>
    <div className="prelude-baseline" aria-hidden="true"><span className="prelude-baseline-rule" /><span>文字 · 创意 · 练习</span><span>{ready ? '选择乐章 · 图中滚动切换' : '选择乐章 · 向下继续 ↓'}</span></div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </section>;
}
