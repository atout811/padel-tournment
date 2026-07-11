import { useEffect, useRef, useState } from 'react';
import { ArrowLeftIcon, MoonIcon, SunIcon } from './Icons';
import { useI18n } from '../i18n/useI18n.js';
import { useConnectionStatus } from '../hooks/useConnectionStatus.js';
import { useThemeMode } from '../hooks/useThemeMode.js';

export default function Header({ backLabel, contextLabel, onBack, user, onSignOut }) {
  const { language, isRtl, t, toggleLanguage } = useI18n();
  const syncStatus = useConnectionStatus();
  const { isLightMode, toggleThemeMode } = useThemeMode();
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
    <header className="sticky top-0 z-30 border-b border-club-border bg-club-bg/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur sm:static sm:rounded-t-lg sm:border sm:px-6 sm:py-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-club-border bg-club-surface px-3 font-black text-club-ink transition hover:bg-club-soft sm:px-4"
            >
              <ArrowLeftIcon className={`h-5 w-5 text-club-green ${isRtl ? 'rotate-180' : ''}`} />
              <span className="hidden sm:inline">{backLabel || t('nav.back')}</span>
            </button>
          )}
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-club-green text-base font-black text-club-greenDeep">
            P
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-club-ink sm:text-2xl">{t('app.name')}</h1>
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs font-bold text-club-muted sm:text-sm">
              <span className="truncate">{contextLabel || t('nav.matchDay')}</span>
              <span className={getSyncIndicatorClass(syncStatus.tone)} title={t(syncStatus.detailKey)}>
                <span className={getSyncDotClass(syncStatus.tone)} />
                {t(syncStatus.labelKey)}
              </span>
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-44 truncate rounded-md bg-club-green/12 px-3 py-2 text-xs font-black uppercase tracking-wide text-club-green sm:inline-flex">
            {contextLabel || t('nav.matchDay')}
          </span>
          <button
            type="button"
            onClick={toggleLanguage}
            className="min-h-10 rounded-lg border border-club-border bg-club-surface px-3 text-xs font-black text-club-green transition hover:bg-club-soft"
            aria-label={t('language.switch')}
            title={t('language.switch')}
          >
            {language === 'ar-EG' ? 'EN' : 'عربي'}
          </button>
          <button
            type="button"
            onClick={toggleThemeMode}
            className="grid h-10 w-10 place-items-center rounded-lg border border-club-border bg-club-surface text-club-green transition hover:bg-club-soft"
            aria-label={isLightMode ? t('theme.switchToDark') : t('theme.switchToLight')}
            title={isLightMode ? t('theme.switchToDark') : t('theme.switchToLight')}
          >
            {isLightMode ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </button>
          {userLabel && (
            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setIsAccountOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-club-border bg-club-surface text-sm font-black uppercase text-club-green transition hover:bg-club-soft"
                aria-label={t('auth.openAccountMenu')}
                aria-expanded={isAccountOpen}
                title={userLabel}
              >
                {getInitial(displayName || userLabel)}
              </button>

              {isAccountOpen && (
                <div className={`absolute top-[calc(100%+0.5rem)] z-50 w-72 rounded-lg border border-club-border bg-club-surface p-3 shadow-2xl shadow-club-shadow/20 ${isRtl ? 'left-0 text-right' : 'right-0 text-left'}`}>
                  <div className="flex items-center gap-3 rounded-lg bg-club-wash p-3">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-club-green text-base font-black uppercase text-club-greenDeep">
                      {getInitial(displayName || userLabel)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-club-ink">{displayName || t('nav.signedIn')}</p>
                      <p className="truncate text-xs font-bold text-club-muted">{userLabel}</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="mt-2 min-h-12 w-full rounded-lg border border-[#DB4145]/30 bg-[#DB4145]/10 px-4 text-sm font-black text-[#DB4145] transition hover:bg-[#DB4145]/20"
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

function getSyncIndicatorClass(tone) {
  const tones = {
    cloud: 'border-club-green/20 bg-club-green/10 text-club-green',
    local: 'border-club-border bg-club-soft text-club-muted',
    offline: 'border-[#F4B84A]/25 bg-[#F4B84A]/10 text-[#F4B84A]',
  };

  return `inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.62rem] font-black uppercase leading-none ${tones[tone] || tones.local}`;
}

function getSyncDotClass(tone) {
  const tones = {
    cloud: 'bg-club-green',
    local: 'bg-club-muted',
    offline: 'bg-[#F4B84A]',
  };

  return `h-1.5 w-1.5 rounded-full ${tones[tone] || tones.local}`;
}
