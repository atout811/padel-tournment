export default function Header() {
  return (
    <header className="rounded-t-lg border border-slate-700 bg-slate-900 px-4 py-5 text-center shadow-lg sm:px-6 sm:py-7">
      <div className="mb-1 flex items-center justify-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 text-lg font-black text-emerald-300">
          P
        </span>
        <h1 className="text-2xl font-bold text-white sm:text-4xl">Padel Tournament Pro</h1>
      </div>
      <p className="text-sm font-medium text-slate-300 sm:text-base">Create cups, run matches, track winners live</p>
    </header>
  );
}
