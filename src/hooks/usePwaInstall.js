import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'padel-night-install-dismissed';

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

const isIosSafari = () => {
  const ua = window.navigator.userAgent;
  const isAppleDevice = /iPad|iPhone|iPod/.test(ua);
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isAppleDevice && !isOtherBrowser;
};

export const usePwaInstall = () => {
  const [installEvent, setInstallEvent] = useState(null);
  const [isInstalled, setIsInstalled] = useState(isStandalone);
  const [isDismissed, setIsDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1');
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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
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
    localStorage.setItem(DISMISS_KEY, '1');
    setIsDismissed(true);
  }, []);

  const canPromptInstall = Boolean(installEvent);
  const showIosHint = isIos && !isInstalled && !isDismissed;
  const showInstallBanner = !isInstalled && !isDismissed && (canPromptInstall || showIosHint);

  return {
    canPromptInstall,
    showInstallBanner,
    showIosHint,
    isInstalled,
    promptInstall,
    dismiss,
  };
};
