export function CustomAlert({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D3B2E]/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[#DDE7DE] bg-white p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#18211C]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#65736A]">{message}</p>
        <button onClick={onClose} className="min-h-12 rounded-2xl bg-[#168A5B] px-8 py-2 font-black text-white hover:bg-[#0F6F49]">
          OK
        </button>
      </div>
    </div>
  );
}

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0D3B2E]/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[#DDE7DE] bg-white p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#18211C]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#65736A]">{message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onCancel} className="min-h-12 w-full rounded-2xl border border-[#DDE7DE] bg-white py-2 font-black text-[#18211C] hover:bg-[#F1F7F2]">Cancel</button>
          <button onClick={onConfirm} className="min-h-12 w-full rounded-2xl bg-red-600 py-2 font-black text-white hover:bg-red-500">Confirm</button>
        </div>
      </div>
    </div>
  );
}


