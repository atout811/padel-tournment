export default function Header() {
  return (
    <header className="rounded-t-3xl border border-[#DDE7DE] bg-white/95 px-4 py-4 shadow-xl shadow-[#163B2E]/5 backdrop-blur sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#168A5B] text-lg font-black text-white shadow-lg shadow-[#168A5B]/20">
            P
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black text-[#18211C] sm:text-3xl">Padel Tournament Pro</h1>
            <p className="truncate text-sm font-bold text-[#65736A]">Fast setup, clear courts, live standings</p>
          </div>
        </div>
        <span className="hidden rounded-full bg-[#E8F6EF] px-3 py-2 text-xs font-black uppercase tracking-wide text-[#146C52] sm:inline-flex">
          Match Day
        </span>
      </div>
    </header>
  );
}
