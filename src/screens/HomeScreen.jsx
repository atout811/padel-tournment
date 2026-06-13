import React from 'react';
import { CourtIcon, SparkIcon, TrophyIcon, UsersIcon } from '../components/Icons';

export default function HomeScreen({ setScreen, selectedGroup }) {
  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">Today</p>
        <h2 className="mt-1 text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">Start a padel night</h2>
      </section>

      <section className="space-y-2">
        {selectedGroup && (
          <HomeRow
            icon={<CourtIcon className="h-6 w-6" />}
            title={selectedGroup.name}
            detail="Start night or open the player pool"
            onClick={() => setScreen('groupHome', { group: selectedGroup })}
          />
        )}
        <HomeRow icon={<UsersIcon className="h-6 w-6" />} title="Groups" detail="Saved player pools and ratings" onClick={() => setScreen('groups')} />
        <HomeRow icon={<TrophyIcon className="h-6 w-6" />} title="Quick Tournament" detail="One-off cup or league" onClick={() => setScreen('setup')} />
      </section>
    </div>
  );
}

function HomeRow({ icon, title, detail, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-20 w-full grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-left shadow-sm transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B] active:scale-[0.99]"
    >
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-lg font-black text-[#F7F8F7]">{title}</span>
        <span className="mt-0.5 block truncate text-sm font-semibold text-[#8D99A6]">{detail}</span>
      </span>
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#BEDC45] text-[#020D16]">
        <SparkIcon className="h-5 w-5" />
      </span>
    </button>
  );
}
