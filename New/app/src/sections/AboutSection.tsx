import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { scrollToSection } from '@/hooks/useSmoothScroll';
import ScoreSilhouette from '@/components/ScoreSilhouette';
import NowSection from '@/sections/NowSection';

const AboutSection: React.FC = () => {
  const headerRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp' });
  const contentRef = useScrollAnimation<HTMLDivElement>({ animation: 'fadeUp', delay: 0.15 });
  const [face, setFace] = useState<'who' | 'about'>('who');

  useEffect(() => {
    const showWho = () => setFace('who');
    const hash = () => { if (location.hash === '#now' || location.hash === '#about') showWho(); };
    window.addEventListener('moqian:show-who', showWho);
    window.addEventListener('hashchange', hash);
    return () => { window.removeEventListener('moqian:show-who', showWho); window.removeEventListener('hashchange', hash); };
  }, []);

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    scrollToSection(href);
  };
  const handleTabKey = (event: React.KeyboardEvent<HTMLButtonElement>, current: 'who' | 'about') => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = current === 'who' ? 'about' : 'who';
    setFace(next);
    document.getElementById(`intro-${next}-tab`)?.focus();
  };

  return (
    <section
      id="about"
      className="score-host intro-section relative py-20 md:py-28"
      style={{
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <ScoreSilhouette piece="sonata" variant="section" className="intro-score" />
      <span id="now" className="intro-old-anchor" aria-hidden="true" />
      <div className="max-w-[1200px] w-full mx-auto px-6 md:px-8">
        <div className="intro-topline">
          <div ref={headerRef}>
            <SectionHeader number="04" title={face === 'who' ? 'Now' : 'About'} subtitle={face === 'who' ? 'Who I am' : '关于墨浅'} />
          </div>
          <div className="intro-tabs" role="tablist" aria-label="关于我的内容">
            <button type="button" role="tab" id="intro-who-tab" aria-controls="intro-who-panel" aria-selected={face === 'who'} tabIndex={face === 'who' ? 0 : -1} onKeyDown={event => handleTabKey(event, 'who')} onClick={() => setFace('who')}>WHO I AM</button>
            <button type="button" role="tab" id="intro-about-tab" aria-controls="intro-about-panel" aria-selected={face === 'about'} tabIndex={face === 'about' ? 0 : -1} onKeyDown={event => handleTabKey(event, 'about')} onClick={() => setFace('about')}>ABOUT</button>
          </div>
        </div>
        <div className="intro-window">
        <div className="intro-faces" data-face={face}>
          <div id="intro-who-panel" className="intro-face" data-active={face === 'who'} role="tabpanel" aria-labelledby="intro-who-tab" aria-hidden={face !== 'who'} inert={face !== 'who'}>
            <NowSection />
          </div>
          <div id="intro-about-panel" className="intro-face" data-active={face === 'about'} role="tabpanel" aria-labelledby="intro-about-tab" aria-hidden={face !== 'about'} inert={face !== 'about'}>
            <div ref={contentRef} className="max-w-[680px]">
          <p
            className="text-[1rem] leading-[2] mb-6"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
          >
            大学生活伊始，我就琢磨着做一个个人网站，用来留存我的个人创作、保留我的个人想法，也用来记录我的成长经历。所以，我就结合音乐的相关元素，做了
            <strong style={{ color: 'var(--fg)', fontWeight: 500 }}>Moqian</strong>
            。
          </p>

          <p
            className="text-[1rem] leading-[2] mb-6"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
          >
            其中，
            <a href="#ballade" className="about-link" onClick={(e) => handleAnchorClick(e, '#ballade')}>Ballade</a>
            是我的个人博文，
            <a href="#etude" className="about-link" onClick={(e) => handleAnchorClick(e, '#etude')}>Étude</a>
            是我的Obsidian笔记。个人项目为
            <a href="#opus" className="about-link" onClick={(e) => handleAnchorClick(e, '#opus')}>Sonata</a>
            ，团队项目为
            <a href="#opus" className="about-link" onClick={(e) => handleAnchorClick(e, '#opus')}>Concerto</a>
            ，均收作
            <a href="#opus" className="about-link" onClick={(e) => handleAnchorClick(e, '#opus')}>Opus</a>
            。
          </p>

          <p
            className="text-[1rem] leading-[2] mb-6"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg-muted)' }}
          >
            它不是一份简历，也不是一个频道，只是一个反映我真实内心的小角落。
          </p>

          <p
            className="text-[1rem] leading-[2]"
            style={{ fontFamily: 'var(--font-body)', color: 'var(--fg)' }}
          >
            静水深流，期望和各位在更美丽的未来相见！
          </p>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
