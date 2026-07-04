import { createPortal } from 'react-dom';
import { useI18n } from '../i18n/useI18n.js';

export function CustomAlert({ title, message, onClose }) {
  const { t } = useI18n();
  return (
    <ViewportPopup>
      <div className="w-full max-w-sm rounded-lg border border-club-border bg-club-surface p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-club-ink">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-club-muted">{message}</p>
        <button onClick={onClose} className="min-h-12 rounded-lg bg-club-green px-8 py-2 font-black text-club-greenDeep hover:bg-club-greenDark">
          {t('common.confirm')}
        </button>
      </div>
    </ViewportPopup>
  );
}

export function ToastViewport({ toasts = [], onDismiss }) {
  const { isRtl } = useI18n();
  const popup = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+1rem))] z-[120] mx-auto flex w-full max-w-md flex-col gap-2 px-3 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg border p-3 shadow-2xl shadow-club-greenDeep/30 backdrop-blur ${
            toast.tone === 'success'
              ? 'border-club-borderStrong bg-club-surface/95'
              : toast.tone === 'danger'
                ? 'border-[#DB4145]/35 bg-[#241014]/95'
                : 'border-club-border bg-club-surface/95'
          }`}
        >
          <div className={`min-w-0 ${isRtl ? 'text-right' : ''}`}>
            <p className={`truncate text-sm font-black ${toast.tone === 'danger' ? 'text-[#DB4145]' : 'text-club-ink'}`}>{toast.title}</p>
            {toast.message && <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-club-muted">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-sm font-black text-club-muted hover:bg-club-wash hover:text-club-ink"
            aria-label="Dismiss notification"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );

  return typeof document === 'undefined' ? popup : createPortal(popup, document.body);
}

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  const { t } = useI18n();
  return (
    <ViewportPopup>
      <div className="w-full max-w-sm rounded-lg border border-club-border bg-club-surface p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-club-ink">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-club-muted">{message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onCancel} className="min-h-12 w-full rounded-lg border border-club-border bg-club-surface py-2 font-black text-club-ink hover:bg-club-wash">
            {t('common.cancel')}
          </button>
          <button onClick={onConfirm} className="min-h-12 w-full rounded-lg bg-[#DB4145] py-2 font-black text-white hover:bg-[#E04C50]">
            {t('common.confirm')}
          </button>
        </div>
      </div>
    </ViewportPopup>
  );
}

function ViewportPopup({ children }) {
  const popup = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-club-bg/75 p-4 backdrop-blur-sm">
      {children}
    </div>
  );

  return typeof document === 'undefined' ? popup : createPortal(popup, document.body);
}
