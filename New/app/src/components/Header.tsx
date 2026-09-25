import React, { useState, useEffect, useCallback, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import BrandSignature from './BrandSignature';
import BrandMark from './brand/BrandMark';
import MobileMenu from './MobileMenu';
import AuthMenu from './AuthMenu';
import { scrollToSection, startScroll, stopScroll } from '@/hooks/useSmoothScroll';

gsap.registerPlugin(ScrollTrigger);

const NAV_LINKS = [
  { num: '01', label: 'Now', href: '#now' },
  { num: '02', label: 'Ballade', href: '#ballade' },
  { num: '03', label: 'Opus', href: '#opus' },
  { num: '04', label: 'Étude', href: '#etude' },
  { num: '05', label: 'About', href: '#about' },
];

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('');
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const lockYRef = useRef(0);

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: document.body,
      start: '100px top',
      onEnter: () => setScrolled(true),
      onLeaveBack: () => setScrolled(false),
    });

    return () => trigger.kill();
  }, []);

  useEffect(() => {
    const sections = NAV_LINKS.map(link => document.querySelector<HTMLElement>(link.href));
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const section = sections.filter(el => el && el.getBoundingClientRect().top <= innerHeight * .42).at(-1);
        setActive(section ? `#${section.id}` : '');
      });
    };
    update(); window.addEventListener('scroll', update, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', update); };
  }, []);

  useEffect(() => {
    const body = document.body;
    if (!menuOpen) return;
    const main = document.querySelector('main');
    if (main) main.inert = true;
    const restore = () => {
      body.style.position = '';
      body.style.top = '';
      body.style.left = '';
      body.style.width = '';
      startScroll();
      if (main) main.inert = false;
      window.scrollTo(0, lockYRef.current);
    };

    if (menuOpen) {
      lockYRef.current = window.scrollY;
      stopScroll();
      body.style.position = 'fixed';
      body.style.top = `-${lockYRef.current}px`;
      body.style.left = '0';
      body.style.width = '100%';
    }
    return restore;
  }, [menuOpen]);

  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (href.startsWith('#')) {
      e.preventDefault();
      setMenuOpen(false);
      scrollToSection(href);
    } else {
      setMenuOpen(false);
    }
  }, []);

  return (
    <>
      <header
        className="fixed top-0 left-0 w-full z-50 transition-all duration-400"
        style={{
          padding: scrolled ? '15px 32px' : '24px 32px',
          backgroundColor: scrolled ? 'rgba(5, 5, 5, 0.9)' : 'transparent',
          backdropFilter: scrolled ? 'blur(8px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(8px)' : 'none',
          borderBottom: scrolled ? '1px solid #1A1A1A' : '1px solid transparent',
        }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
              e.preventDefault();
              scrollToSection(0);
            }}
            className="brand-link flex items-center gap-4 group"
          >
            <BrandSignature className="h-[1.9rem] w-auto" />
            <BrandMark className="h-9 md:h-10" />
          </a>

          <div className="flex items-center gap-4 md:gap-7">
            <nav className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={active === link.href ? 'location' : undefined}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="group relative text-[0.75rem] tracking-[0.05em] transition-colors duration-300 hover:text-[var(--fg)]"
                  style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
                >
                  <span className="text-[var(--fg-dim)]">{link.num}</span>{' '}
                  <span>{link.label}</span>
                  <span
                    className="absolute bottom-[-4px] left-0 h-[1px] bg-[var(--fg)] transition-all duration-500 ease-out w-0 group-hover:w-full"
                    style={{ transformOrigin: 'left' }}
                  />
                </a>
              ))}
            </nav>

            <AuthMenu />

            <button
              className="md:hidden flex flex-col items-center justify-center w-8 h-8 gap-[5px]"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
              aria-controls="mobile-navigation"
            >
              <span
                className="block w-5 h-[1px] bg-[var(--fg-muted)] transition-all duration-300"
                style={{ transform: menuOpen ? 'rotate(45deg) translate(2px, 2px)' : 'none' }}
              />
              <span
                className="block w-5 h-[1px] bg-[var(--fg-muted)] transition-all duration-300"
                style={{ opacity: menuOpen ? 0 : 1 }}
              />
              <span
                className="block w-5 h-[1px] bg-[var(--fg-muted)] transition-all duration-300"
                style={{ transform: menuOpen ? 'rotate(-45deg) translate(2px, -2px)' : 'none' }}
              />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={menuOpen} onClose={closeMenu} links={NAV_LINKS} />
    </>
  );
};

export default Header;
