import React, { useEffect, useRef, useState } from 'react';
import { startScroll, stopScroll } from '@/hooks/useSmoothScroll';

const GITHUB = 'https://github.com/YinLingxiao';
const EMAIL = 'yinlingxiaoo@gmail.com';

const ContactCard: React.FC = () => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = () => {
    dialogRef.current?.showModal();
    stopScroll();
  };

  const close = () => dialogRef.current?.close();

  const copyEmail = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      const input = document.createElement('textarea');
      input.value = EMAIL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      input.remove();
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-haspopup="dialog"
        className="group flex items-center gap-1 text-[0.75rem] tracking-[0.05em] transition-colors hover:text-[var(--fg)]"
        style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}
      >
        contact me
        <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5">
          ↗
        </span>
      </button>

      <dialog
        ref={dialogRef}
        className="contact-card"
        aria-labelledby="contact-card-title"
        onClose={() => { startScroll(); setCopied(false); }}
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="contact-card__body">
          <button type="button" className="contact-card__close" onClick={close} aria-label="关闭">×</button>
          <img src="/portrait.jpg" alt="" width={1105} height={1125} className="contact-card__portrait" />
          <p className="contact-card__eyebrow">Contact · 联系</p>
          <h2 id="contact-card-title" className="contact-card__name">Y.I.A.</h2>
          <dl className="contact-card__list">
            <div>
              <dt>GitHub</dt>
              <dd><a href={GITHUB} target="_blank" rel="noopener noreferrer">github.com/YinLingxiao ↗</a></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${EMAIL}`} onClick={copyEmail} title="点击复制">{EMAIL}</a>
                <span className="contact-card__status" aria-live="polite">{copied ? '已复制' : ''}</span>
              </dd>
            </div>
          </dl>
        </div>
      </dialog>
    </>
  );
};

export default ContactCard;
