import React from 'react';
import { SparkIcon, TrophyIcon, UsersIcon } from '../components/Icons';

export default function HomeScreen({ setScreen }) {
  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#19232B] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFD2D3]">Padel Tournament Pro</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Start a match day</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium text-[#BEDC45]">
          Create a one-off tournament or manage a reusable group player pool.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <HomeChoice
          icon={<TrophyIcon className="h-7 w-7" />}
          title="Quick Start"
          detail="Add names for this tournament only."
          action="Set Up Tournament"
          onClick={() => setScreen('setup')}
        />
        <HomeChoice
          icon={<UsersIcon className="h-7 w-7" />}
          title="My Padel Groups"
          detail="Reuse a saved player pool with levels."
          action="Open Groups"
          onClick={() => setScreen('groups')}
        />
      </section>
    </div>
  );
}

function HomeChoice({ icon, title, detail, action, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-56 rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-5 text-left shadow-sm transition hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B] active:scale-[0.99]"
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">{icon}</span>
      <span className="mt-5 block text-2xl font-black text-[#F7F8F7]">{title}</span>
      <span className="mt-2 block text-sm font-semibold leading-relaxed text-[#8D99A6]">{detail}</span>
      <span className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#BEDC45] px-4 font-black text-[#020D16]">
        <SparkIcon className="h-5 w-5" />
        {action}
      </span>
    </button>
  );
}
