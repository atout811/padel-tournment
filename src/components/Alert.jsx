import { createPortal } from 'react-dom';

export function CustomAlert({ title, message, onClose }) {
  return (
    <ViewportPopup>
      <div className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#F7F8F7]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#8D99A6]">{message}</p>
        <button onClick={onClose} className="min-h-12 rounded-2xl bg-[#BEDC45] px-8 py-2 font-black text-[#020D16] hover:bg-[#D3F05A]">
          OK
        </button>
      </div>
    </ViewportPopup>
  );
}

export function ToastViewport({ toasts = [], onDismiss }) {
  const popup = (
    <div className="pointer-events-none fixed inset-x-0 bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+1rem))] z-[120] mx-auto flex w-full max-w-md flex-col gap-2 px-3 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-2xl border p-3 shadow-2xl shadow-[#020D16]/30 backdrop-blur ${
            toast.tone === 'success'
              ? 'border-[#BEDC45]/35 bg-[#102018]/95'
              : toast.tone === 'danger'
                ? 'border-[#DB4145]/35 bg-[#241014]/95'
                : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E]/95'
          }`}
        >
          <div className="min-w-0">
            <p className={`truncate text-sm font-black ${toast.tone === 'danger' ? 'text-[#DB4145]' : 'text-[#F7F8F7]'}`}>{toast.title}</p>
            {toast.message && <p className="mt-0.5 line-clamp-2 text-xs font-semibold text-[#8D99A6]">{toast.message}</p>}
          </div>
          <button
            type="button"
            onClick={() => onDismiss?.(toast.id)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-black text-[#8D99A6] hover:bg-[#07111B] hover:text-[#F7F8F7]"
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
  return (
    <ViewportPopup>
      <div className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#F7F8F7]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#8D99A6]">{message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onCancel} className="min-h-12 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] py-2 font-black text-[#F7F8F7] hover:bg-[#07111B]">
            Cancel
          </button>
          <button onClick={onConfirm} className="min-h-12 w-full rounded-2xl bg-[#DB4145] py-2 font-black text-white hover:bg-[#E04C50]">
            Confirm
          </button>
        </div>
      </div>
    </ViewportPopup>
  );
}

function ViewportPopup({ children }) {
  const popup = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#020D16]/75 p-4 backdrop-blur-sm">
      {children}
    </div>
  );

  return typeof document === 'undefined' ? popup : createPortal(popup, document.body);
}
