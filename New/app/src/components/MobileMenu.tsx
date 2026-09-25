import React, { useEffect, useRef } from 'react';
import { scrollToSection } from '@/hooks/useSmoothScroll';
import MotionControls from './motion/MotionControls';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { num: string; label: string; href: string }[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, links }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const root = containerRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      id="mobile-navigation"
      role="dialog"
      aria-modal="true"
      aria-label="导航菜单"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 overflow-y-auto py-20"
      style={{ backgroundColor: 'rgba(5, 5, 5, 0.98)', backdropFilter: 'blur(16px)' }}
    >
      {/* Close button */}
      <button
        ref={closeRef}
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        aria-label="关闭菜单"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>

      {/* Nav links */}
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          onClick={(e) => {
            if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            if (link.href.startsWith('#')) {
              e.preventDefault();
              onClose();
              requestAnimationFrame(() => scrollToSection(link.href));
            } else {
              onClose();
            }
          }}
          className="text-[1.5rem] tracking-[0.05em] text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          <span className="text-[var(--fg-dim)] text-[1rem]">{link.num}</span>{' '}
          {link.label}
        </a>
      ))}
      <MotionControls />
    </div>
  );
};

export default MobileMenu;
