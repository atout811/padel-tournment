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
  const { isRtl, t } = useI18n();
  const popup = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[120] mx-auto w-full max-w-md px-3">
      {toasts.slice(-1).map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'danger' ? 'alert' : 'status'}
          className={`${toast.tone === 'win' ? 'toast-win' : 'toast-arrival'} pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border p-3 shadow-2xl shadow-club-shadow/20 backdrop-blur ${
            toast.tone === 'success'
              ? 'border-club-borderStrong bg-club-surface/95'
              : toast.tone === 'danger'
                ? 'border-[#DB4145]/35 bg-[#241014]/95'
                : 'border-club-border bg-club-surface/95'
          }`}
        >
          {toast.tone === 'win' && <span className="toast-win-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span>}
          <div className={`min-w-0 flex-1 ${isRtl ? 'text-right' : ''}`}>
            <p className={`toast-title break-words text-sm font-black ${toast.tone === 'danger' ? 'text-[#DB4145]' : 'text-club-ink'}`}>{toast.title}</p>
            {toast.message && <p className="toast-message mt-0.5 line-clamp-2 text-xs font-semibold text-club-muted">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            className="toast-close grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-black text-club-muted hover:bg-club-wash hover:text-club-ink"
            aria-label={t('common.close')}
          >
            ×
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
