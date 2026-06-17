import React, { useEffect, useState } from 'react';
import { fetchGroupLeaderboard, getPlayerWinRate } from '../utils/playerProgressionService';
import { CourtIcon, SparkIcon, TrophyIcon, UsersIcon } from '../components/Icons';

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

  const totalMatches = activePlayers.reduce((sum, player) => sum + Number(player.matchesPlayed || 0), 0);
  const averageRating = activePlayers.length
    ? Math.round(activePlayers.reduce((sum, player) => sum + Number(player.rating || 0), 0) / activePlayers.length)
    : 0;
  const topPlayer = activePlayers[0] || null;
  const streakLeader = activePlayers.reduce((leader, player) => {
    if (!leader) return player;
    return Number(player.currentStreak || 0) > Number(leader.currentStreak || 0) ? player : leader;
  }, null);
  const activeStreakLeader = Number(streakLeader?.currentStreak || 0) > 0 ? streakLeader : null;
  const readiness = getNightReadiness(activePlayers.length);

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] shadow-lg shadow-[#020D16]/20">
        <div className="grid gap-4 p-4 sm:grid-cols-[1.2fr_0.8fr] sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">Weekly Night</span>
              <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{readiness.label}</span>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black leading-tight text-[#F7F8F7] sm:text-4xl">{group.name}</h2>
            <p className="mt-2 text-sm font-bold text-[#CFD2D3]">{readiness.detail}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setScreen('startGroupNight')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-5 font-black text-[#020D16] transition hover:bg-[#D3F05A]"
              >
                <CourtIcon className="h-5 w-5" />
                Start Tonight's Games
              </button>
              <button
                type="button"
                onClick={() => setScreen('playersPool')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-5 font-black text-[#F7F8F7] transition hover:bg-[#0D1823]"
              >
                <UsersIcon className="h-5 w-5 text-[#BEDC45]" />
                Player Cards
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <NightMetric label="Friends" value={activePlayers.length} />
            <NightMetric label="Matches" value={totalMatches} />
            <NightMetric label="Avg Rating" value={averageRating || '-'} />
            <NightMetric label="Hot Streak" value={streakLeader?.currentStreak || 0} />
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SpotlightCard
          icon={<TrophyIcon className="h-6 w-6" />}
          title="Top Seed"
          player={topPlayer}
          detail={topPlayer ? `${topPlayer.rating} rating` : 'No players yet'}
        />
        <SpotlightCard
          icon={<SparkIcon className="h-6 w-6" />}
          title="In Form"
          player={activeStreakLeader}
          detail={activeStreakLeader ? `${activeStreakLeader.currentStreak} win streak` : 'No streak yet'}
        />
        <GroupAction
          icon={<UsersIcon className="h-6 w-6" />}
          title="Build The Squad"
          detail={`${activePlayers.length} active friend${activePlayers.length === 1 ? '' : 's'}`}
          onClick={() => setScreen('playersPool')}
        />
      </section>

      <LeaderboardCard players={activePlayers.slice(0, 5)} onOpenPool={() => setScreen('playersPool')} onStartNight={() => setScreen('startGroupNight')} />
    </div>
  );
}

function LeaderboardCard({ players, onOpenPool, onStartNight }) {
  return (
    <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-[#F7F8F7]">This Week's Board</h3>
          <p className="text-sm font-semibold text-[#8D99A6]">Ranked by level, rating, wins, and form.</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onOpenPool} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-black text-[#8D99A6] hover:bg-[#07111B]">
            Cards
          </button>
          <button type="button" onClick={onStartNight} className="rounded-2xl bg-[#BEDC45] px-4 py-2 text-sm font-black text-[#020D16] hover:bg-[#D3F05A]">
            Play
          </button>
        </div>
      </div>

      {players.length ? (
        <div className="space-y-2">
          {players.map((player, index) => (
            <div key={player.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
              <span className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${index === 0 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black text-[#F7F8F7]">{player.name}</p>
                <p className="mt-0.5 text-xs font-bold text-[#8D99A6]">
                  {player.matchesPlayed ? `${player.wins}W ${player.losses}L / ${getPlayerWinRate(player)}%` : 'Fresh player'}
                </p>
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

function NightMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] p-3">
      <p className="text-2xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-1 truncate text-[0.62rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function SpotlightCard({ icon, title, player, detail }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-[#BEDC45]">{icon}</span>
      <span className="mt-4 block text-sm font-black uppercase tracking-wide text-[#8D99A6]">{title}</span>
      <span className="mt-1 block truncate text-xl font-black text-[#F7F8F7]">{player?.name || 'Open spot'}</span>
      <span className="mt-1 block text-sm font-semibold text-[#8D99A6]">{detail}</span>
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

function getNightReadiness(playerCount) {
  if (playerCount >= 8) {
    return { label: 'Cup Ready', detail: `${playerCount} friends are ready for a full cup night.` };
  }
  if (playerCount >= 4) {
    return { label: 'League Ready', detail: `${playerCount} friends are ready for a league night.` };
  }
  const missingPlayers = 4 - playerCount;
  return {
    label: 'Recruiting',
    detail: `Add ${missingPlayers} more friend${missingPlayers === 1 ? '' : 's'} to start a league night.`,
  };
}
