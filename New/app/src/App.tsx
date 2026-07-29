import React, { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import CustomCursor from '@/components/CustomCursor';
import Header from '@/components/Header';
import HeroSection from '@/sections/HeroSection';
import NowSection from '@/sections/NowSection';
import WritingsSection from '@/sections/WritingsSection';
import OpusSection from '@/sections/OpusSection';
import EtudeSection from '@/sections/EtudeSection';
import AboutSection from '@/sections/AboutSection';
import FooterSection from '@/sections/FooterSection';

gsap.registerPlugin(ScrollTrigger);

const App: React.FC = () => {
  useSmoothScroll();

  // Header entrance animation
  useEffect(() => {
    const header = document.querySelector('header');
    if (header) {
      gsap.fromTo(
        header,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 0.3 }
      );
    }
  }, []);

  return (
    <div className="relative min-h-[100dvh]" style={{ backgroundColor: 'var(--bg)' }}>
      <CustomCursor />
      <Header />
      <main>
        <HeroSection />
        <NowSection />
        <WritingsSection />
        <OpusSection />
        <EtudeSection />
        <AboutSection />
        <FooterSection />
      </main>
    </div>
  );
};

export default App;
