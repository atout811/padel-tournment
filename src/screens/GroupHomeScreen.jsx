import React, { useEffect, useState } from 'react';
import { fetchGroupPlayers } from '../utils/groupPlayerService';
import { CourtIcon, ListIcon, UsersIcon } from '../components/Icons';

export default function GroupHomeScreen({ group, showAlert, setScreen }) {
  const [activePlayers, setActivePlayers] = useState([]);

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    fetchGroupPlayers(group.id)
      .then((players) => {
        if (active) setActivePlayers(players);
      })
      .catch((error) => {
        console.error('Error loading group players:', error);
        showAlert('Error', 'Could not load group players.');
      });
    return () => {
      active = false;
    };
  }, [group?.id, showAlert]);

  if (!group) {
    return (
      <div className="rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-6">
        <button type="button" onClick={() => setScreen('groups')} className="rounded-2xl bg-[#BEDC45] px-5 py-3 font-black text-[#020D16]">
          Back to Groups
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#19232B] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFD2D3]">Padel Group</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{group.name}</h2>
        <p className="mt-2 text-sm font-medium text-[#BEDC45]">{activePlayers.length} active player{activePlayers.length === 1 ? '' : 's'} in the pool.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <GroupAction icon={<CourtIcon className="h-6 w-6" />} title="Start New Night" detail="Select players and guests." onClick={() => setScreen('startGroupNight')} />
        <GroupAction icon={<UsersIcon className="h-6 w-6" />} title="Players Pool" detail="Add, edit, or deactivate players." onClick={() => setScreen('playersPool')} />
        <GroupAction icon={<ListIcon className="h-6 w-6" />} title="Back" detail="Return to all groups." onClick={() => setScreen('groups')} />
      </section>
    </div>
  );
}

function GroupAction({ icon, title, detail, onClick }) {
  return (
    <button type="button" onClick={onClick} className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 text-left shadow-sm transition hover:bg-[#07111B]">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">{icon}</span>
      <span className="mt-4 block text-xl font-black text-[#F7F8F7]">{title}</span>
      <span className="mt-1 block text-sm font-semibold text-[#8D99A6]">{detail}</span>
    </button>
  );
}
