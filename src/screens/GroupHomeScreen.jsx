import React, { useEffect, useState } from 'react';
import { fetchGroupLeaderboard, getPlayerWinRate } from '../utils/playerProgressionService';
import { CourtIcon, UsersIcon } from '../components/Icons';

export default function GroupHomeScreen({ group, showAlert, setScreen }) {
  const [activePlayers, setActivePlayers] = useState([]);

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    fetchGroupLeaderboard(group.id)
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
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">Group</p>
        <div className="mt-1 flex items-end justify-between gap-3">
          <h2 className="min-w-0 truncate text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">{group.name}</h2>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{activePlayers.length}</span>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <GroupAction icon={<CourtIcon className="h-6 w-6" />} title="Start New Night" detail="Select players and guests." onClick={() => setScreen('startGroupNight')} />
        <GroupAction icon={<UsersIcon className="h-6 w-6" />} title="Players Pool" detail="Add, edit, or deactivate players." onClick={() => setScreen('playersPool')} />
      </section>

      <LeaderboardCard players={activePlayers.slice(0, 5)} onOpenPool={() => setScreen('playersPool')} />
    </div>
  );
}

function LeaderboardCard({ players, onOpenPool }) {
  return (
    <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#F7F8F7]">Group Leaderboard</h3>
          <p className="text-sm font-semibold text-[#8D99A6]">Top players by level and rating.</p>
        </div>
        <button type="button" onClick={onOpenPool} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-black text-[#8D99A6] hover:bg-[#07111B]">
          Players Pool
        </button>
      </div>

      {players.length ? (
        <div className="space-y-2">
          {players.map((player, index) => (
            <div key={player.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
              <span className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${index === 0 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black text-[#F7F8F7]">{player.name}</p>
                <p className="mt-0.5 text-xs font-bold text-[#8D99A6]">{player.matchesPlayed ? `${getPlayerWinRate(player)}% win rate` : 'No matches yet'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-[#BEDC45]">Level {player.level}</p>
                <p className="text-sm font-black tabular-nums text-[#F7F8F7]">{player.rating}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">No active players yet.</p>
      )}
    </section>
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
