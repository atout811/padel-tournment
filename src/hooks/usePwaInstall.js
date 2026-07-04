import { useCallback, useEffect, useState } from 'react';

const DISMISS_UNTIL_KEY = 'padel-night-install-dismissed-until';
const LEGACY_DISMISS_KEY = 'padel-night-install-dismissed';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIosSafari = () => {
  const ua = window.navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isAppleDevice && !isOtherBrowser;
};

const getDismissedUntil = () => {
  try {
    if (localStorage.getItem(LEGACY_DISMISS_KEY) === '1') {
      return Number.MAX_SAFE_INTEGER;
    }
    return Number(localStorage.getItem(DISMISS_UNTIL_KEY) || 0);
  } catch {
    return 0;
  }
};

export const usePwaInstall = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [dismissedUntil, setDismissedUntil] = useState(getDismissedUntil);
  const [hasUsefulAction, setHasUsefulAction] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    setIsIos(isIosSafari());

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallEvent(null);
    };

    const handleUsefulAction = () => setHasUsefulAction(true);
    const fallbackTimer = window.setTimeout(() => setHasUsefulAction(true), 45000);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('padel-night:useful-action', handleUsefulAction);

    return () => {
      window.clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('padel-night:useful-action', handleUsefulAction);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installEvent) return false;

    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    setInstallEvent(null);

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    return outcome === 'accepted';
  }, [installEvent]);

  const dismiss = useCallback(() => {
    const nextDismissedUntil = Date.now() + DISMISS_COOLDOWN_MS;
    try {
      localStorage.setItem(DISMISS_UNTIL_KEY, String(nextDismissedUntil));
      localStorage.removeItem(LEGACY_DISMISS_KEY);
    } catch {
      // Keep the banner hidden for this session if storage is unavailable.
    }
    setDismissedUntil(nextDismissedUntil);
  }, []);

  const canPromptInstall = Boolean(installEvent);
  const isDismissed = Date.now() < dismissedUntil;
  const showIosHint = isIos && !isInstalled && !isDismissed;
  const showInstallBanner = hasUsefulAction && !isInstalled && !isDismissed && (canPromptInstall || showIosHint);

  return {
    canPromptInstall,
    showInstallBanner,
    showIosHint,
    isInstalled,
    promptInstall,
    dismiss,
  };
};
