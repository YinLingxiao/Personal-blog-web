import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AsciiMoon from '@/components/AsciiMoon';
import StaticGalaxy from '@/components/StaticGalaxy';
import LunarMark from '@/components/LunarMark';
import { useMotionPolicy } from '@/components/motion/motion';
import { scrollToSection } from '@/hooks/useSmoothScroll';
import type { MoonScene } from '@/graphics/livingMoon';
import { markProgress } from '@/graphics/markProgress';

const CAPTIONS = {
  moon: { zh: '月光落下，序曲将起', en: 'Moonlight gathers; the prelude begins.', action: '展开星河' },
  galaxy: { zh: '星河缓行，归于月华', en: 'The galaxy drifts, returning to moonlight.', action: '收拢为月' },
  mark: { zh: '星月成印', en: 'Moon and star, set as a seal.' },
} as const;
const MOON_RELEASE_END = .24, MARK_START = .32, MOON_CAPTION_START = .14, MARK_CAPTION_START = .58;
const HINT_KEY = 'moqian:moon-hint-seen';
const readHintPending = () => { try { return localStorage.getItem(HINT_KEY) !== 'true'; } catch { return true; } };

export default function HeroSection() {
  const root = useRef<HTMLElement>(null), art = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoonScene | undefined>(undefined);
  const [galaxy, setGalaxy] = useState(true);
  const [scrollPhase, setScrollPhase] = useState<'top' | 'moon' | 'mark'>('top');
  const [settled, setSettled] = useState(false);
  const [hintOffered] = useState(readHintPending);
  const [hintPending, setHintPending] = useState(hintOffered);
  const [announcement, setAnnouncement] = useState('');
  const galaxyRef = useRef(galaxy);
  const { reduced, quality } = useMotionPolicy();
  useEffect(() => { galaxyRef.current = galaxy; sceneRef.current?.galaxy(galaxy); }, [galaxy]);
  // 3D 月亮块加载期间先隐藏 ASCII 回退，避免首屏闪出占位月亮；须在绘制前设置，故用 layout effect
  useLayoutEffect(() => {
    const artwork = art.current;
    if (!artwork || reduced) return;
    artwork.dataset.loading = 'true';
    return () => { delete artwork.dataset.loading; };
  }, [reduced, quality]);
  useEffect(() => {
    const section = root.current, container = host.current, artwork = art.current, surface = stage.current;
    if (!section || !container || !artwork || !surface) return;
    let scene: MoonScene | undefined, disposed = false, visible = true, progress = 0;
    const hasHash = !!location.hash, pinned = !reduced && quality === 'desktop' && !hasHash;
    const apply = () => {
      const mark = pinned ? Math.max(0, Math.min(1, (progress - MARK_START) / (1 - MARK_START))) : Math.min(.2, progress * .2);
      scene?.scroll(mark, Math.min(1, progress / MOON_RELEASE_END));
      const state = markProgress(mark), set = (name: string, value: string | number) => artwork.style.setProperty(`--mark-${name}`, String(value));
      set('moon', state.moon.opacity); set('moon-y', `${state.moon.offset}px`); set('moon-rot', `${state.moon.rotate}deg`);
      set('star', state.star.opacity); set('star-y', `${state.star.offset}px`); set('star-scale', state.star.scale);
      set('ray', state.ray.opacity); set('ray-y', `${state.ray.offset}px`);
      set('glint-x', `${state.glint * 170}px`); set('glint-opacity', Math.sin(Math.PI * state.glint));
      set('fade', state.fade);
    };
    const trigger = ScrollTrigger.create({ trigger: section, start: 'top top',
      end: pinned ? () => `+=${innerHeight * 2.1}` : 'bottom top', pin: pinned, pinSpacing: pinned, invalidateOnRefresh: true,
      onUpdate: self => {
        progress = self.progress; apply();
        setScrollPhase(pinned && artwork.dataset.fallback !== 'true' && progress >= MARK_CAPTION_START ? 'mark' : progress >= MOON_CAPTION_START ? 'moon' : 'top');
        artwork.style.setProperty('--moon-scroll-opacity', String(pinned ? 1 : 1 - progress));
      },
    });
    if (reduced) return () => { trigger.kill(); artwork.style.removeProperty('--moon-scroll-opacity'); };
    const pause = () => scene?.pause(document.hidden || !visible);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; pause(); }); observer.observe(section);
    const resize = new ResizeObserver(() => scene?.resize()); resize.observe(container);
    document.addEventListener('visibilitychange', pause);
    const fail = () => { setSettled(true); delete artwork.dataset.loading; delete artwork.dataset.ready; artwork.dataset.fallback = 'true'; sceneRef.current = undefined; if (progress >= MOON_CAPTION_START) setScrollPhase('moon'); };
    const frame = requestAnimationFrame(() => {
      import('@/graphics/livingMoon').then(({ createMoon }) => {
        if (disposed) return;
        let arrival = !hasHash;
        try { arrival = arrival && sessionStorage.getItem('moqian-moon-arrived') !== 'true'; sessionStorage.setItem('moqian-moon-arrived', 'true'); } catch { void 0; }
        artwork.dataset.arrival = String(arrival);
        try {
          scene = createMoon(container, { mobile: quality !== 'desktop', arrival, galaxy: galaxyRef.current, surface,
            onReady: () => { delete artwork.dataset.loading; artwork.dataset.ready = 'true'; setSettled(true); },
            onFallback: () => { fail(); scene?.dispose(); },
          });
          sceneRef.current = scene; scene.galaxy(galaxyRef.current); apply(); pause();
        } catch { fail(); }
      }).catch(fail);
    });
    return () => {
      disposed = true; cancelAnimationFrame(frame); scene?.dispose(); sceneRef.current = undefined; trigger.kill(); observer.disconnect(); resize.disconnect();
      document.removeEventListener('visibilitychange', pause); delete artwork.dataset.ready; delete artwork.dataset.fallback; delete artwork.dataset.arrival;
      artwork.style.removeProperty('--moon-scroll-opacity');
    };
  }, [reduced, quality]);
  const mode = scrollPhase === 'top' ? galaxy ? 'galaxy' : 'moon' : scrollPhase;
  const showHint = hintPending && scrollPhase === 'top' && (reduced || settled);
  const toggleMoon = () => {
    const next = !galaxy;
    setGalaxy(next);
    setAnnouncement(`已切换至${next ? '星河' : '月亮'}：${CAPTIONS[next ? 'galaxy' : 'moon'].zh}`);
    if (!hintPending) return;
    setHintPending(false);
    try { localStorage.setItem(HINT_KEY, 'true'); } catch { void 0; }
  };
  return <section id="prelude" ref={root} className="living-prelude">
    <div className="prelude-heading"><span>00 / Prelude</span><span>墨浅 · A living score</span></div>
    <div className="prelude-composition">
      <div className="prelude-copy">
        <p className="prelude-kicker">·安静的角落，文字的栖息地·</p><h1>墨浅</h1>
        <p className="prelude-intro">在这里，我把内心书写，将创意编织。</p>
        <a className="prelude-link" href="#now" onClick={e => {
          if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          e.preventDefault(); scrollToSection('#now');
        }}>序幕之后，是正曲 <span aria-hidden="true">→</span></a>
      </div>
      <div ref={art} className="moon-art" data-mode={mode}>
        <div ref={stage} className="moon-stage">
          <div className="moon-visual" aria-hidden="true">
            <svg className="moon-orbits" viewBox="0 0 600 600"><circle cx="300" cy="300" r="250"/><path d="M30 300H68M532 300H570M300 30V68M300 532V570"/><circle cx="300" cy="300" r="205" strokeDasharray="1 15"/></svg>
            <div className="moon-fallback"><div className="fallback-moon"><AsciiMoon /></div><StaticGalaxy className="fallback-galaxy" /></div>
            <div ref={host} className="moon-canvas" />
            <LunarMark />
          </div>
          <button type="button" className="moon-toggle" aria-pressed={mode === 'galaxy'} aria-label={galaxy ? CAPTIONS.galaxy.action : CAPTIONS.moon.action} disabled={scrollPhase !== 'top'} onClick={toggleMoon} />
        </div>
        <p className="moon-caption">
          {hintOffered && <small className="moon-hint" data-visible={showHint} aria-hidden="true">轻触月相 · tap the moon</small>}
          {(['galaxy', 'moon', 'mark'] as const).map(key => <span key={key} data-active={key === mode} aria-hidden={key !== mode}>
            <span lang="zh-CN">{CAPTIONS[key].zh}</span><span lang="en">{CAPTIONS[key].en}</span>
          </span>)}
        </p>
      </div>
    </div>
    <div className="prelude-baseline" aria-hidden="true"><span>文字 · 创意 · 练习</span><span>Scroll to unfold ↓</span></div>
    <p className="sr-only" aria-live="polite">{announcement}</p>
  </section>;
}
