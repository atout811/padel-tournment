import { useCallback, useEffect, useRef, useState } from 'react';
import { markWelcomeShown, shouldShowWelcome } from '../utils/storage';
import { useI18n } from '../i18n/useI18n.js';
import PadelArtwork from './PadelArtwork.jsx';

export default function WelcomeGate({ children }) {
  const { isRtl, t } = useI18n();
  const [visible, setVisible] = useState(shouldShowWelcome);
  const skipRef = useRef(null);
  const contentRef = useRef(null);
  const dismiss = useCallback(() => setVisible(false), []);

  useEffect(() => {
    if (!visible) return undefined;

    markWelcomeShown();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    skipRef.current?.focus({ preventScroll: true });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(dismiss, reducedMotion ? 700 : 2800);
    const onKeyDown = (event) => {
      if (event.key === 'Escape') dismiss();
      // The welcome has one control; keep keyboard focus inside it.
      if (event.key === 'Tab') {
        event.preventDefault();
        skipRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dismiss, visible]);

  useEffect(() => {
    if (!visible && document.activeElement === document.body) {
      contentRef.current?.focus({ preventScroll: true });
    }
  }, [visible]);

  return (
    <>
      <div ref={contentRef} tabIndex={-1} className="welcome-content" inert={visible} aria-hidden={visible || undefined}>
        {children}
      </div>
      {visible && (
        <section className="welcome-screen" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
          <div className="welcome-court" aria-hidden="true"><span /><span /></div>
          <div className="welcome-topline"><span>PADEL NIGHT</span><span>LET’S PLAY ↗</span></div>
          <div className="welcome-center">
            <div className="welcome-art"><PadelArtwork /></div>
            <p className="welcome-eyebrow">{isRtl ? 'لمّ الشلة. احجز الملعب. وسيب الباقي علينا.' : 'YOUR FRIENDS. YOUR COURT. YOUR NIGHT.'}</p>
            <h1 id="welcome-title">{t('app.name')}<span aria-hidden="true">.</span></h1>
            <p className="welcome-tagline">{isRtl ? 'اللعب يحلى بيكم.' : 'Good games start here.'}</p>
          </div>
          <div className="welcome-bottom">
            <div className="welcome-progress" aria-hidden="true"><span /></div>
            <button ref={skipRef} type="button" onClick={dismiss}>{isRtl ? 'يلا نلعب ←' : 'Let’s play →'}</button>
          </div>
        </section>
      )}
    </>
  );
}
