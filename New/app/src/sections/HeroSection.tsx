import React, { useState, useCallback, useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AsciiMoon from '@/components/AsciiMoon';
import TypewriterText from '@/components/TypewriterText';
import Badge from '@/components/Badge';
import ParticleBackground from '@/components/ParticleBackground';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { scrollToSection } from '@/hooks/useSmoothScroll';

gsap.registerPlugin(ScrollTrigger);

const BADGES = ['[ CS ]', '[ AI ]', '[ 美学&理学 ]'];
const MOON_DIM = '#2A2A2A';
const MOON_LIT = '#505050';

const HeroSection: React.FC = () => {
  const isMobile = useIsMobile();
  const [typingDone, setTypingDone] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const moonRef = useRef<HTMLDivElement>(null);
  const moonGlowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const badgesRef = useRef<HTMLDivElement>(null);

  const handleTypingComplete = useCallback(() => {
    setTypingDone(true);
  }, []);

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return;

    const tween = gsap.to(contentRef.current, {
      opacity: 0,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top top',
        end: '30% top',
        scrub: true,
      },
    });

    return () => {
      tween.kill();
    };
  }, []);

  useEffect(() => {
    if (!typingDone) return;

    const tl = gsap.timeline();

    if (moonRef.current) {
      tl.to(moonRef.current, { color: MOON_LIT, duration: 1.8, ease: 'power2.out' }, 0);
    }

    if (moonGlowRef.current) {
      tl.to(moonGlowRef.current, { opacity: 1, duration: 2.2, ease: 'power2.out' }, 0);
    }

    if (titleRef.current) {
      gsap.set(titleRef.current, { opacity: 0, y: 30 });
      tl.to(titleRef.current, {
        opacity: 1,
        y: 0,
        duration: 1.0,
        ease: 'power3.out',
      });
    }

    if (descRef.current) {
      gsap.set(descRef.current, { opacity: 0, y: 30 });
      tl.to(
        descRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 1.0,
          ease: 'power3.out',
        },
        '-=0.7'
      );
    }

    if (badgesRef.current) {
      const badges = badgesRef.current.children;
      gsap.set(badges, { opacity: 0, scale: 0 });
      tl.to(
        badges,
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: 'back.out(1.7)',
          stagger: 0.15,
        },
        '-=0.3'
      );
    }

    return () => {
      tl.kill();
    };
  }, [typingDone]);

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100dvh] flex flex-col items-center overflow-hidden"
      style={{ paddingTop: '15vh' }}
    >
      <ParticleBackground />

      <div ref={contentRef} className="relative z-10 w-full max-w-[1200px] px-6 md:px-8 flex flex-col items-center text-center">
        <div
          className="flex items-center gap-3 mb-8 text-[0.625rem] uppercase tracking-[0.28em]"
          style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-dim)' }}
        >
          <span className="w-8 h-px" style={{ backgroundColor: 'var(--border)' }} />
          <span>00 · Prelude</span>
          <span className="w-8 h-px" style={{ backgroundColor: 'var(--border)' }} />
        </div>

        <div
          ref={moonRef}
          className="relative mb-12"
          style={{ color: isMobile ? MOON_LIT : MOON_DIM }}
        >
          <div
            ref={moonGlowRef}
            className="absolute pointer-events-none"
            style={{
              inset: '-45%',
              background: 'radial-gradient(ellipse at center, var(--moon-glow) 0%, transparent 70%)',
              opacity: isMobile ? 0.75 : 0,
              zIndex: -1,
            }}
          />
          {!isMobile ? (
            <TypewriterText
              text={`                        -------            \n                 ---------------         \n              --------~-------~~~--      \n            ------~~---~~---------~~-    \n           ------~--~~-~--~~-~-~~---~   \n          --~~-~-~~-~--~~--~~~~---~--   \n         ---~--~--~~--~~--~--~--~-~--   \n         ~-~-~-~~--~-~--~-~-~-~---~---  \n         ---~-~--~--~-~-~~--~--~--~-~-  \n          -~-~-~-~--~--~-~-~---~-~--~   \n           ~-~-~~-~--~~-~~--~~---~--    \n            ---~-~--~--~~--~-~-~--      \n              -~--~-~-~-~~-~~---        \n                 -~-~-~-~---            \n                        ~-              `}
              speed={8}
              className="block leading-[1.2] tracking-[0.05em] whitespace-pre"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(0.5rem, 1.2vw, 0.9rem)',
              }}
              onComplete={handleTypingComplete}
            />
          ) : (
            <AsciiMoon
              variant="small"
              style={{ fontSize: '0.6rem' }}
            />
          )}
        </div>

        <div
          ref={titleRef}
          className="flex flex-col items-center gap-2"
          style={{ opacity: isMobile ? 1 : 0 }}
        >
          <span
            className="text-[1.05rem] tracking-[0.14em] md:text-[1.15rem]"
            style={{ fontFamily: 'var(--font-literary)', color: 'var(--fg-muted)' }}
          >
            ·理性的代码，感性的乐章·
          </span>
          <h1
            className="font-normal tracking-[0.06em]"
            style={{
              fontFamily: 'var(--font-calligraphy)',
              color: '#f0ece4',
              fontSize: 'clamp(3.75rem, 8vw, 7rem)',
              lineHeight: 1.05,
              textShadow: '0 0 32px rgba(240, 236, 228, 0.08)',
            }}
          >
            墨浅
          </h1>
        </div>

        <div
          ref={descRef}
          className="mt-8 max-w-[480px]"
          style={{ opacity: isMobile ? 1 : 0 }}
        >
          <p
            className="text-[1rem] leading-[2] tracking-[0.05em]"
            style={{ fontFamily: 'var(--font-literary)', color: 'var(--fg-muted)' }}
          >
            指尖落下，编辑器里敲出的是逻辑，而这个小站，是我安放作品的独奏舞台
          </p>

          <a
            href="#now"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('#now');
            }}
            className="group inline-flex items-center gap-2 mt-8 text-[0.95rem] tracking-[0.14em] transition-colors duration-300 hover:text-[var(--fg)]"
            style={{ fontFamily: 'var(--font-literary)', color: 'var(--fg-muted)' }}
          >
            序幕之后，是正曲
            <span className="inline-block transition-transform duration-300 group-hover:translate-x-1">
              →
            </span>
          </a>
        </div>

        <div
          ref={badgesRef}
          className="flex flex-wrap items-center justify-center gap-3 mt-auto pt-[8vh] md:pt-[12vh] pb-8"
        >
          {BADGES.map((badge, i) => (
            <div key={i} style={{ opacity: isMobile ? 1 : 0 }}>
              <Badge>{badge}</Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
