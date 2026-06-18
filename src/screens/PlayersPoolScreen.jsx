import React, { useCallback, useEffect, useState } from 'react';
import { addGroupPlayer, deactivateGroupPlayer, fetchGroupPlayers, subscribeToGroupPlayers, updateGroupPlayer } from '../utils/groupPlayerService';
import { getPlayerWinRate } from '../utils/playerProgressionService';
import { CheckIcon, SparkIcon, TrashIcon, TrophyIcon, UsersIcon } from '../components/Icons';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
});

export default function PlayersPoolScreen({ group, showAlert, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editLevel, setEditLevel] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  const loadPlayers = useCallback(async () => {
    if (!group?.id) return;
    const items = await fetchGroupPlayers(group.id);
    setPlayers(items);
  }, [group?.id]);

  useEffect(() => {
    loadPlayers().catch((error) => {
      console.error('Error loading players:', error);
      showAlert('Error', 'Could not load players.');
    });
  }, [loadPlayers, showAlert]);

  useEffect(() => {
    if (!group?.id) return undefined;
    return subscribeToGroupPlayers(group.id, (items) => setPlayers(items));
  }, [group?.id]);

  const handleAdd = async () => {
    try {
      setIsSaving(true);
      await addGroupPlayer({ groupId: group.id, name, level });
      setName('');
      setLevel(1);
      setShowAddPlayer(false);
      await loadPlayers();
    } catch (error) {
      console.error('Error adding player:', error);
      showAlert('Player Not Saved', error.message || 'Could not add this player.');
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (player) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditLevel(player.initialLevel || player.level);
  };

  const saveEdit = async () => {
    try {
      setIsSaving(true);
      await updateGroupPlayer(editingId, { name: editName, level: editLevel });
      setEditingId(null);
      await loadPlayers();
    } catch (error) {
      console.error('Error updating player:', error);
      showAlert('Player Not Saved', error.message || 'Could not update this player.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async (playerId) => {
    try {
      setIsSaving(true);
      await deactivateGroupPlayer(playerId);
      await loadPlayers();
    } catch (error) {
      console.error('Error deactivating player:', error);
      showAlert('Error', 'Could not deactivate this player.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) {
    return (
      <div className="rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-6">
        <button type="button" onClick={() => setScreen('groups')} className="rounded-2xl bg-[#BEDC45] px-5 py-3 font-black text-[#020D16]">
          Back to Groups
        </button>
      </div>
    );
  }

  const rankedPlayers = sortPlayersForCards(players);
  const totalMatches = players.reduce((sum, player) => sum + Number(player.matchesPlayed || 0), 0);
  const bestStreak = players.reduce((max, player) => Math.max(max, Number(player.bestStreak || 0)), 0);
  const averageWinRate = players.length
    ? Math.round(players.reduce((sum, player) => sum + getPlayerWinRate(player), 0) / players.length)
    : 0;

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] shadow-lg shadow-[#020D16]/20">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">Squad Board</span>
            <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">Friend Cards</span>
          </div>
          <h2 className="mt-3 min-w-0 truncate text-3xl font-black leading-tight text-[#F7F8F7] sm:text-4xl">{group?.name || 'Group'}</h2>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 py-2">
        <div className="grid grid-cols-2 divide-y divide-[rgba(255,255,255,0.08)] sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <PoolMetric label="Players" value={players.length} />
          <PoolMetric label="Matches" value={totalMatches} />
          <PoolMetric label="Avg Win" value={`${averageWinRate}%`} />
          <PoolMetric label="Best Streak" value={bestStreak} />
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <button type="button" onClick={() => setShowAddPlayer((current) => !current)} className="flex min-h-12 w-full items-center justify-between gap-3 text-left">
          <span className="inline-flex items-center gap-2 text-lg font-black text-[#F7F8F7]">
            <UsersIcon className="h-5 w-5" />
            Add Player
          </span>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#BEDC45]">{showAddPlayer ? 'Hide' : 'Open'}</span>
        </button>
        {showAddPlayer && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAdd();
                }
              }}
              maxLength={28}
              className="min-h-14 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
              placeholder="Player name"
              autoCapitalize="words"
              autoComplete="name"
              enterKeyHint="done"
            />
            <LevelSelect value={level} onChange={setLevel} disabled={isSaving} />
            <button type="button" onClick={handleAdd} disabled={isSaving} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-6 font-black text-[#020D16] disabled:opacity-60">
              Add
            </button>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#F7F8F7]">Friend Cards</h3>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{players.length}</span>
        </div>
        {players.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {rankedPlayers.map((player, index) => (
              <div key={player.id} className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
                {editingId === player.id ? (
                  <div className="grid gap-2 sm:grid-cols-[1fr_120px_auto_auto]">
                    <input
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="min-h-12 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-3 font-semibold text-[#F7F8F7] outline-none focus:border-[#BEDC45]"
                      autoCapitalize="words"
                      autoComplete="name"
                      enterKeyHint="done"
                    />
                    <LevelSelect value={editLevel} onChange={setEditLevel} disabled={isSaving} />
                    <button type="button" onClick={saveEdit} disabled={isSaving} className="rounded-2xl bg-[#BEDC45] px-4 font-black text-[#020D16] disabled:opacity-60">
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 font-black text-[#8D99A6]">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <PlayerProfileCard
                    player={player}
                    rank={index + 1}
                    onEdit={() => startEdit(player)}
                    onDeactivate={() => handleDeactivate(player.id)}
                    isSaving={isSaving}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">Add the first player.</p>
        )}
      </section>
    </div>
  );
}

function PlayerProfileCard({ player, rank, onEdit, onDeactivate, isSaving }) {
  const matchesPlayed = Math.max(0, Number(player.matchesPlayed || 0));
  const wins = Math.max(0, Number(player.wins || 0));
  const losses = Math.max(0, Number(player.losses || 0));
  const winRate = getPlayerWinRate(player);
  const currentStreak = Math.max(0, Number(player.currentStreak || 0));
  const bestStreak = Math.max(0, Number(player.bestStreak || 0));
  const cardTag = getPlayerCardTag(player, rank);

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#BEDC45] text-lg font-black text-[#020D16]">
          {getInitials(player.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#07111B] px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-[#BEDC45]">#{rank}</span>
            <span className="rounded-full bg-[#1F60D1]/16 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-[#CFD2D3]">{cardTag}</span>
          </div>
          <h4 className="mt-2 break-words text-xl font-black leading-tight text-[#F7F8F7]">{player.name}</h4>
          <p className="mt-1 text-sm font-bold text-[#8D99A6]">
            Level {player.level} <span className="text-[#CFD2D3]">Rating {player.rating}</span>
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <CardStat label="Record" value={matchesPlayed ? `${wins}-${losses}` : '0-0'} />
        <CardStat label="Win Rate" value={`${winRate}%`} />
        <CardStat label="Matches" value={matchesPlayed} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <CardStat label="Current Streak" value={currentStreak} icon={<SparkIcon className="h-4 w-4" />} />
        <CardStat label="Best Streak" value={bestStreak} icon={<TrophyIcon className="h-4 w-4" />} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-[#07111B] px-3 py-2">
        <p className="min-w-0 truncate text-xs font-bold text-[#8D99A6]">
          Last played <span className="text-[#CFD2D3]">{formatLastPlayed(player.lastPlayedAt)}</span>
        </p>
        <CheckIcon className="h-4 w-4 shrink-0 text-[#BEDC45]" />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={onEdit} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-4 py-2 font-black text-[#F7F8F7] hover:bg-[#07111B]">
          Edit
        </button>
        <button type="button" onClick={onDeactivate} disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#DB4145]/30 bg-[#DB4145]/10 px-4 py-2 font-black text-[#DB4145] disabled:opacity-60">
          <TrashIcon className="h-4 w-4" />
          Deactivate
        </button>
      </div>
    </div>
  );
}

function PoolMetric({ label, value }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 px-3 py-2 sm:justify-center sm:px-4">
      <p className="truncate text-[0.62rem] font-black uppercase tracking-wide text-[#8D99A6] sm:order-2">{label}</p>
      <p className="text-lg font-black tabular-nums text-[#F7F8F7] sm:order-1">{value}</p>
    </div>
  );
}

function CardStat({ label, value, icon }) {
  return (
    <div className="rounded-2xl bg-[#07111B] p-2 text-center">
      <p className="flex min-h-6 items-center justify-center gap-1 text-lg font-black tabular-nums text-[#F7F8F7]">
        {icon}
        {value}
      </p>
      <p className="mt-0.5 truncate text-[0.58rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function sortPlayersForCards(players) {
  return [...players].sort(
    (left, right) =>
      Number(right.level || 0) - Number(left.level || 0) ||
      Number(right.rating || 0) - Number(left.rating || 0) ||
      getPlayerWinRate(right) - getPlayerWinRate(left) ||
      Number(right.wins || 0) - Number(left.wins || 0) ||
      left.name.localeCompare(right.name)
  );
}

function getPlayerCardTag(player, rank) {
  if (rank === 1) return 'Current #1';
  if (Number(player.currentStreak || 0) >= 3) return 'Hot Streak';
  if (rank === 2) return 'Next Threat';
  if (Number(player.matchesPlayed || 0) === 0) return 'Fresh Signing';
  if (getPlayerWinRate(player) >= 65) return 'Clutch Pick';
  if (Number(player.matchesPlayed || 0) >= 10) return 'Court Regular';
  return 'Rising';
}

function getInitials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatLastPlayed(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'not yet';
}

function LevelSelect({ value, onChange, disabled }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#8D99A6]">Level</p>
      <div className="grid grid-cols-5 gap-1 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] p-1">
        {[1, 2, 3, 4, 5].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            disabled={disabled}
            aria-pressed={value === item}
            className={`min-h-12 rounded-xl text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
            value === item ? 'motion-soft-pop bg-[#BEDC45] text-[#020D16]' : 'text-[#8D99A6] hover:bg-[#0A141E] hover:text-[#F7F8F7]'
          }`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
