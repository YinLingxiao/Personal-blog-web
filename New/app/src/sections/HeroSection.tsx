import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AsciiMoon from '@/components/AsciiMoon';
import StaticGalaxy from '@/components/StaticGalaxy';
import { useMotionPolicy } from '@/components/motion/motion';
import { scrollToSection } from '@/hooks/useSmoothScroll';
import type { MoonScene } from '@/graphics/livingMoon';

const CAPTIONS = {
  moon: { zh: '月色入谱，流入星河', en: 'Moonlight enters the score, then flows into the stars.', action: '展开星河' },
  galaxy: { zh: '星河缓行，归于月华', en: 'The galaxy drifts, returning to moonlight.', action: '收拢为月' },
} as const;

export default function HeroSection() {
  const root = useRef<HTMLElement>(null), art = useRef<HTMLDivElement>(null), stage = useRef<HTMLDivElement>(null), host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoonScene | undefined>(undefined);
  const [galaxy, setGalaxy] = useState(false);
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
    if (!section || !container || !artwork || !surface || reduced) return;
    let scene: MoonScene | undefined, disposed = false, visible = true, progress = 0;
    const hasHash = !!location.hash, pinned = quality === 'desktop' && !hasHash;
    const apply = () => scene?.scroll(pinned ? progress : progress * .2, pinned ? progress : 0);
    const trigger = ScrollTrigger.create({ trigger: section, start: 'top top',
      end: pinned ? () => `+=${innerHeight * .65}` : 'bottom top', pin: pinned, pinSpacing: pinned, invalidateOnRefresh: true,
      onUpdate: self => {
        progress = self.progress; apply();
        artwork.style.setProperty('--moon-scroll-opacity', String(pinned ? 1 : 1 - progress));
      },
    });
    const pause = () => scene?.pause(document.hidden || !visible);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; pause(); }); observer.observe(section);
    const resize = new ResizeObserver(() => scene?.resize()); resize.observe(container);
    document.addEventListener('visibilitychange', pause);
    const fail = () => { delete artwork.dataset.loading; delete artwork.dataset.ready; artwork.dataset.fallback = 'true'; sceneRef.current = undefined; };
    const frame = requestAnimationFrame(() => {
      import('@/graphics/livingMoon').then(({ createMoon }) => {
        if (disposed) return;
        let arrival = !hasHash;
        try { arrival = arrival && sessionStorage.getItem('moqian-moon-arrived') !== 'true'; sessionStorage.setItem('moqian-moon-arrived', 'true'); } catch { void 0; }
        artwork.dataset.arrival = String(arrival);
        try {
          scene = createMoon(container, { mobile: quality !== 'desktop', arrival, galaxy: galaxyRef.current, surface,
            onReady: () => { delete artwork.dataset.loading; artwork.dataset.ready = 'true'; },
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
  const mode = galaxy ? 'galaxy' : 'moon';
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
          </div>
          <button type="button" className="moon-toggle" aria-pressed={galaxy} aria-label={CAPTIONS[mode].action} onClick={() => setGalaxy(open => !open)} />
        </div>
        <p className="moon-caption" aria-live="polite">
          {(['moon', 'galaxy'] as const).map(key => <span key={key} data-active={key === mode} aria-hidden={key !== mode}>
            <span lang="zh-CN">{CAPTIONS[key].zh}</span><span lang="en">{CAPTIONS[key].en}</span>
          </span>)}
        </p>
      </div>
    </div>
    <div className="prelude-baseline" aria-hidden="true"><span>文字 · 创意 · 练习</span><span>Scroll to unfold ↓</span></div>
  </section>;
}
