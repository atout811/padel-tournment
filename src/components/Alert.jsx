export function CustomAlert({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="mb-4 text-slate-300">{message}</p>
        <button onClick={onClose} className="min-h-11 rounded-lg bg-sky-600 px-8 py-2 font-bold text-white hover:bg-sky-500">
          OK
        </button>
      </div>
    </div>
  );
}

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-xl font-bold">{title}</h3>
        <p className="mb-4 text-slate-300">{message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onCancel} className="min-h-11 w-full rounded-lg bg-slate-700 py-2 font-bold text-white hover:bg-slate-600">Cancel</button>
          <button onClick={onConfirm} className="min-h-11 w-full rounded-lg bg-red-600 py-2 font-bold text-white hover:bg-red-500">Confirm</button>
        </div>
      </div>
    </div>
  );
}


