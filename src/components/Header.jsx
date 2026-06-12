export default function Header() {
  return (
    <header className="rounded-t-3xl border border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 px-4 py-4 shadow-xl shadow-[#020D16]/5 backdrop-blur sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#BEDC45] text-lg font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20">
            P
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-[#F7F8F7] sm:text-3xl">Padel Tournament Pro</h1>
            <p className="truncate text-sm font-bold text-[#8D99A6]">Fast setup, clear courts, live standings</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-[#BEDC45]/14 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#BEDC45] sm:inline-flex">
          Match Day
        </span>
      </div>
    </header>
  );
}
