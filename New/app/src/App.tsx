import React from 'react';
import { useMotionRoot } from '@/components/motion/motion';
import './living-score.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';
import CustomCursor from '@/components/motion/CustomCursor';
import Header from '@/components/Header';
import ParticleBackground from '@/components/ParticleBackground';
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

  const { reduced } = useMotionRoot();

  return (
    <div className="relative isolate min-h-[100dvh]" style={{ backgroundColor: 'var(--bg)' }}>
      {!reduced && <div className="home-atmosphere"><ParticleBackground /></div>}
      <CustomCursor />
      <Header />
      <main className="relative z-10">
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
