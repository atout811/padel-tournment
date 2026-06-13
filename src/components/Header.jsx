import { ArrowLeftIcon } from './Icons';

export default function Header({ backLabel, contextLabel = 'Match Day', onBack, user, onSignOut }) {
  const userLabel = user?.email || user?.user_metadata?.full_name || '';

  return (
    <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] shadow-xl shadow-[#020D16]/5 backdrop-blur sm:static sm:rounded-t-3xl sm:border sm:px-6 sm:py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 font-black text-[#F7F8F7] transition hover:bg-[#0D1823] sm:px-4"
            >
              <ArrowLeftIcon className="h-5 w-5 text-[#BEDC45]" />
              <span className="hidden sm:inline">{backLabel || 'Back'}</span>
            </button>
          )}
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#BEDC45] text-lg font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20">
            P
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-black text-[#F7F8F7] sm:text-3xl">Padel Night</h1>
            <p className="truncate text-xs font-bold text-[#8D99A6] sm:text-sm">{contextLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-44 truncate rounded-full bg-[#BEDC45]/14 px-3 py-2 text-xs font-black uppercase tracking-wide text-[#BEDC45] sm:inline-flex">
            {contextLabel}
          </span>
          {userLabel && (
            <button
              type="button"
              onClick={onSignOut}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] text-sm font-black uppercase text-[#BEDC45] transition hover:bg-[#0D1823]"
              aria-label="Sign out"
              title={`Sign out ${userLabel}`}
            >
              {getInitial(userLabel)}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function getInitial(value) {
  return String(value || '?').trim().charAt(0) || '?';
}
