import React, { useEffect, useMemo, useState } from 'react';
import { fetchGroupPlayers, subscribeToGroupPlayers } from '../utils/groupPlayerService';
import { createGroupSession, linkGroupSessionTournament } from '../utils/groupSessionService';
import { createTournamentRecord } from '../utils/tournamentService';
import { buildTournament } from '../utils/tournamentBuilder';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import SegmentedControl from '../components/SegmentedControl.jsx';
import { CheckIcon, CourtIcon, ListIcon, TrophyIcon, UsersIcon, XIcon } from '../components/Icons';

export default function StartGroupNightScreen({ group, showAlert, setTournament, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [guests, setGuests] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup');
  const [courtCount, setCourtCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    fetchGroupPlayers(group.id)
      .then((items) => {
        if (!active) return;
        setPlayers(items);
        setSelectedIds(new Set(items.map((player) => player.id)));
      })
      .catch((error) => {
        console.error('Error loading players:', error);
        showAlert('Error', 'Could not load group players.');
      });
    return () => {
      active = false;
    };
  }, [group?.id, showAlert]);

  useEffect(() => {
    if (!group?.id) return undefined;
    return subscribeToGroupPlayers(group.id, (items) => {
      setPlayers((currentPlayers) => {
        const currentIds = new Set(currentPlayers.map((player) => player.id));
        const newIds = items.filter((player) => !currentIds.has(player.id)).map((player) => player.id);
        if (newIds.length) {
          setSelectedIds((current) => new Set([...current, ...newIds]));
        }
        return items;
      });
    });
  }, [group?.id]);

  const selectedPlayers = useMemo(() => players.filter((player) => selectedIds.has(player.id)), [players, selectedIds]);
  const participantNames = useMemo(() => [...selectedPlayers.map((player) => player.name), ...guests.map((guest) => guest.name)], [selectedPlayers, guests]);
  const setupStatus = useMemo(() => getSetupStatus(participantNames, tournamentFormat), [participantNames, tournamentFormat]);

  const togglePlayer = (playerId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleAddGuest = () => {
    const validation = validatePlayerName(guestName, participantNames);
    if (!validation.isValid) {
      showAlert('Check Guest Name', validation.message);
      return;
    }
    setGuests((current) => [...current, { id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: validation.name }]);
    setGuestName('');
  };

  const removeGuest = (guestId) => {
    setGuests((current) => current.filter((guest) => guest.id !== guestId));
  };

  const startNight = async () => {
    if (!setupStatus.isValid) {
      showAlert('Night Not Ready', setupStatus.message);
      return;
    }

    // TODO Smart Shuffle: use group player rating/level here before names are paired into teams.
    const participantMeta = [
      ...selectedPlayers.map((player) => ({
        name: player.name,
        groupPlayerId: player.id,
        level: player.level,
        initialLevel: player.initialLevel || player.level,
        rating: player.rating,
        matchesPlayed: player.matchesPlayed || 0,
        wins: player.wins || 0,
        losses: player.losses || 0,
        currentStreak: player.currentStreak || 0,
        bestStreak: player.bestStreak || 0,
        source: 'group',
      })),
      ...guests.map((guest) => ({ name: guest.name, level: 3, source: 'guest' })),
    ];

    try {
      setIsSaving(true);
      const session = await createGroupSession({ groupId: group.id, participantMeta });
      const tournament = buildTournament({
        players: participantNames,
        format: tournamentFormat,
        courtCount,
        metadata: {
          groupId: group.id,
          groupSessionId: session.id,
          participantMeta,
        },
      });
      const createdTournament = await createTournamentRecord(tournament);
      await linkGroupSessionTournament(session.id, createdTournament.id);
      setTournament(createdTournament);
      setScreen('tournament');
    } catch (error) {
      console.error('Error starting group night:', error);
      showAlert('Error', error.message || 'Could not start the group night.');
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

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] shadow-lg shadow-[#020D16]/20">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">Tonight</span>
            <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{setupStatus.isValid ? 'Ready' : 'Need Players'}</span>
          </div>
          <h2 className="mt-3 min-w-0 truncate text-3xl font-black leading-tight text-[#F7F8F7] sm:text-4xl">{group?.name || 'Group Night'}</h2>
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 py-2">
        <div className="grid grid-cols-3 divide-x divide-[rgba(255,255,255,0.08)]">
          <PlanMetric icon={<UsersIcon className="h-4 w-4" />} label="Players" value={participantNames.length} />
          <PlanMetric icon={<CourtIcon className="h-4 w-4" />} label="Courts" value={courtCount} />
          <PlanMetric icon={tournamentFormat === 'cup' ? <TrophyIcon className="h-4 w-4" /> : <ListIcon className="h-4 w-4" />} label="Format" value={tournamentFormat === 'cup' ? 'Cup' : 'League'} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <SegmentedControl
          label="Format"
          value={tournamentFormat}
          disabled={isSaving}
          onChange={setTournamentFormat}
          options={[
            { value: 'cup', label: 'Cup', icon: <TrophyIcon className="h-4 w-4" /> },
            { value: 'league', label: 'League', icon: <ListIcon className="h-4 w-4" /> },
          ]}
        />
        <SegmentedControl
          label="Courts"
          value={courtCount}
          disabled={isSaving}
          onChange={setCourtCount}
          columns="grid-cols-3"
          options={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
          ]}
        />
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black text-[#F7F8F7]">Playing Tonight</h3>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black tabular-nums text-[#BEDC45]">{participantNames.length}</span>
        </div>
        {players.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerSelectCard key={player.id} player={player} selected={selectedIds.has(player.id)} onClick={() => togglePlayer(player.id)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">No saved players. Add guests or build the pool.</p>
        )}
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#F7F8F7]">Guests</h3>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddGuest();
              }
            }}
            className="min-h-14 flex-1 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 font-semibold text-[#F7F8F7] outline-none placeholder:text-[#8D99A6] focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20"
            placeholder="Guest name"
            autoCapitalize="words"
            autoComplete="name"
            enterKeyHint="done"
          />
          <button type="button" onClick={handleAddGuest} className="min-h-14 rounded-2xl bg-[#BEDC45] px-6 font-black text-[#020D16]">
            Add Guest
          </button>
        </div>
        {guests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {guests.map((guest) => (
              <span key={guest.id} className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] py-2 pl-3 pr-1 text-sm font-black text-[#F7F8F7]">
                {guest.name}
                <button type="button" onClick={() => removeGuest(guest.id)} className="grid h-8 w-8 place-items-center rounded-xl text-[#8D99A6] hover:bg-[#DB4145]/10 hover:text-[#DB4145]">
                  <XIcon className="h-4 w-4" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 rounded-3xl border border-white/10 bg-[#07111B]/95 p-3 shadow-2xl shadow-[#020D16]/15 backdrop-blur">
        <div className="grid gap-2">
          <button type="button" onClick={startNight} disabled={isSaving || !setupStatus.isValid} className="min-h-14 rounded-2xl bg-[#BEDC45] px-4 text-lg font-black text-[#020D16] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.08)] disabled:text-[#8D99A6]">
            {isSaving ? 'Starting...' : setupStatus.isValid ? "Start Tonight's Games" : setupStatus.message}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerSelectCard({ player, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-3xl border p-3 text-left transition ${
        selected ? 'border-[#BEDC45] bg-[#BEDC45]/14 shadow-[0_0_0_3px_rgba(22,138,91,0.10)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0D1823] hover:bg-[#07111B]'
      }`}
    >
      <span className="flex items-center gap-3">
        <span
          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition ${
            selected ? 'border-[#BEDC45] bg-[#BEDC45] text-[#020D16]' : 'border-[rgba(190,220,69,0.32)] bg-[#0A141E] text-transparent'
          }`}
          aria-hidden="true"
        >
          <CheckIcon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-black text-[#F7F8F7]">{player.name}</span>
          <span className="mt-1 block text-sm font-bold text-[#8D99A6]">Level {player.level}</span>
          <span className="mt-0.5 block text-xs font-bold text-[#8D99A6]">Rating {player.rating}</span>
        </span>
      </span>
    </button>
  );
}

function PlanMetric({ icon, label, value }) {
  return (
    <div className="flex min-h-14 items-center justify-center gap-2 px-2 py-2">
      <div className="text-[#BEDC45]">{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-[0.58rem] font-black uppercase tracking-wide text-[#8D99A6]">{label}</p>
        <p className="truncate text-sm font-black text-[#F7F8F7]">{value}</p>
      </div>
    </div>
  );
}

