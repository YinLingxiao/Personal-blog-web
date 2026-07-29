import React from 'react';
import { scrollToSection } from '@/hooks/useSmoothScroll';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  links: { num: string; label: string; href: string }[];
}

const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose, links }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-12"
      style={{ backgroundColor: 'rgba(5, 5, 5, 0.98)', backdropFilter: 'blur(16px)' }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center text-[var(--fg-muted)] hover:text-[var(--fg)] transition-colors"
        aria-label="Close menu"
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
            if (link.href.startsWith('#')) {
              e.preventDefault();
              onClose();
              scrollToSection(link.href);
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
    </div>
  );
};

export default MobileMenu;
