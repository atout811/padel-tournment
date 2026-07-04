import { usePwaInstall } from '../hooks/usePwaInstall.js';
import { useI18n } from '../i18n/useI18n.js';
import { Button } from './Ui.jsx';

export default function InstallPrompt() {
  const { showInstallBanner, showIosHint, canPromptInstall, promptInstall, dismiss } = usePwaInstall();
  const { t } = useI18n();

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 px-3 sm:bottom-6 sm:px-4">
      <div className="mx-auto flex max-w-6xl items-start gap-3 rounded-lg border border-club-border bg-club-surface p-4 shadow-2xl shadow-club-shadow/20">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-club-ink">{t('install.title')}</p>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-club-muted">
            {showIosHint ? t('install.ios') : t('install.default')}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {canPromptInstall && (
            <Button
              onClick={promptInstall}
              size="sm"
            >
              {t('common.install')}
            </Button>
          )}
          <Button
            tone="quiet"
            onClick={dismiss}
            size="sm"
          >
            {t('common.notNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
