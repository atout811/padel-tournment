import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon } from './Icons';
import { useI18n } from '../i18n/useI18n.js';

export default function Header({ backLabel, contextLabel = 'Match Day', onBack, user, onSignOut }) {
  const { language, isRtl, t, toggleLanguage } = useI18n();
  const userLabel = user?.email || user?.user_metadata?.full_name || '';
  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef(null);

  useEffect(() => {
    if (!isAccountOpen) return undefined;

    const handlePointerDown = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isAccountOpen]);

  const handleSignOut = () => {
    setIsAccountOpen(false);
    onSignOut?.();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl shadow-[#020D16]/5 backdrop-blur sm:static sm:rounded-t-3xl sm:border sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 font-black text-[#F7F8F7] transition hover:bg-[#0D1823] sm:px-4"
            >
              <ArrowLeftIcon className={`h-5 w-5 text-[#BEDC45] ${isRtl ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">{backLabel || t('nav.back')}</span>
            </button>
          )}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#BEDC45] text-lg font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20">
            P
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-[#F7F8F7] sm:text-3xl">{t('app.name')}</h1>
            <p className="truncate text-xs font-bold text-[#8D99A6] sm:text-sm">{contextLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-44 truncate rounded-full bg-[#BEDC45]/14 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#BEDC45] sm:inline-flex">
            {contextLabel}
          </span>
          <button
            type="button"
            onClick={toggleLanguage}
            className="min-h-11 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 text-xs font-black text-[#BEDC45] transition hover:bg-[#0D1823]"
            aria-label={t('language.switch')}
            title={t('language.switch')}
          >
            {language === 'ar-EG' ? 'EN' : 'عربي'}
          </button>
          {userLabel && (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAccountOpen((open) => !open)}
                className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] text-sm font-black uppercase text-[#BEDC45] transition hover:bg-[#0D1823]"
                aria-label="Open account menu"
                aria-expanded={isAccountOpen}
                title={userLabel}
              >
                {getInitial(displayName || userLabel)}
              </button>

              {isAccountOpen && (
                <div className={`absolute top-[calc(100%+0.5rem)] z-50 w-72 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 shadow-2xl shadow-[#020D16]/40 ${isRtl ? 'left-0 text-right' : 'right-0 text-left'}`}>
                  <div className="flex items-center gap-3 rounded-2xl bg-[#07111B] p-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#BEDC45] text-base font-black uppercase text-[#020D16]">
                      {getInitial(displayName || userLabel)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#F7F8F7]">{displayName || t('nav.signedIn')}</p>
                      <p className="truncate text-xs font-bold text-[#8D99A6]">{userLabel}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-2 min-h-12 w-full rounded-2xl border border-[#DB4145]/30 bg-[#DB4145]/10 px-4 text-sm font-black text-[#DB4145] transition hover:bg-[#DB4145]/20"
                  >
                    {t('nav.signOut')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function getInitial(value) {
  return String(value || '?').trim().charAt(0) || '?';
}
