export function CustomAlert({ title, message, onClose }) {
  return (
    <div className="fixed inset-0 z-[100] grid h-dvh place-items-center overflow-y-auto bg-[#020D16]/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#F7F8F7]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#8D99A6]">{message}</p>
        <button onClick={onClose} className="min-h-12 rounded-2xl bg-[#BEDC45] px-8 py-2 font-black text-[#020D16] hover:bg-[#D3F05A]">
          OK
        </button>
      </div>
    </div>
  );
}

export function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] grid h-dvh place-items-center overflow-y-auto bg-[#020D16]/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-5 text-center shadow-2xl">
        <h3 className="mb-2 text-2xl font-black text-[#F7F8F7]">{title}</h3>
        <p className="mb-5 text-sm font-semibold leading-relaxed text-[#8D99A6]">{message}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onCancel} className="min-h-12 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] py-2 font-black text-[#F7F8F7] hover:bg-[#07111B]">Cancel</button>
          <button onClick={onConfirm} className="min-h-12 w-full rounded-2xl bg-[#DB4145] py-2 font-black text-white hover:bg-[#E04C50]">Confirm</button>
        </div>
      </div>
    </div>
  );
}


