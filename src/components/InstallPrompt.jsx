import { usePwaInstall } from '../hooks/usePwaInstall.js';

export default function InstallPrompt() {
  const { showInstallBanner, showIosHint, canPromptInstall, promptInstall, dismiss } = usePwaInstall();

  if (!showInstallBanner) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-50 px-3 sm:bottom-6 sm:px-4">
      <div className="mx-auto flex max-w-6xl items-start gap-3 rounded-2xl border border-[#BEDC45]/30 bg-[#07111B] p-4 shadow-2xl shadow-[#020D16]/40">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-[#F7F8F7]">Install Padel Night</p>
          <p className="mt-1 text-xs leading-relaxed text-[#8D99A6]">
            {showIosHint
              ? 'Tap Share, then "Add to Home Screen" for quick access from your home screen.'
              : 'Add the app to your home screen for faster access and a full-screen experience.'}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {canPromptInstall && (
            <button
              type="button"
              onClick={promptInstall}
              className="rounded-xl bg-[#BEDC45] px-3 py-2 text-xs font-black text-[#020D16] transition hover:bg-[#d4f058]"
            >
              Install
            </button>
          )}
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl px-3 py-2 text-xs font-black text-[#8D99A6] transition hover:text-[#F7F8F7]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
