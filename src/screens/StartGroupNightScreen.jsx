import React, { useEffect, useMemo, useState } from 'react';
import { fetchGroupPlayers } from '../utils/groupPlayerService';
import { createGroupSession, linkGroupSessionTournament } from '../utils/groupSessionService';
import { createTournamentRecord } from '../utils/tournamentService';
import { buildTournament } from '../utils/tournamentBuilder';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
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

    const participantMeta = [
      ...selectedPlayers.map((player) => ({ name: player.name, groupPlayerId: player.id, level: player.level, source: 'group' })),
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
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#19232B] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFD2D3]">Start New Night</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">{group?.name || 'Group Night'}</h2>
        <p className="mt-2 text-sm font-medium text-[#BEDC45]">{participantNames.length} selected for this tournament.</p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryTile icon={<UsersIcon />} label="Players" value={participantNames.length} detail={setupStatus.message} />
        <SummaryTile icon={<CourtIcon />} label="Courts" value={courtCount} detail={courtCount === 1 ? 'single court' : `${courtCount} active courts`} />
        <SummaryTile icon={tournamentFormat === 'cup' ? <TrophyIcon /> : <ListIcon />} label="Format" value={tournamentFormat === 'cup' ? 'Cup' : 'League'} detail={`${setupStatus.minPlayers}+ needed`} />
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <h3 className="text-lg font-black text-[#F7F8F7]">Group Players</h3>
        {players.length ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerSelectCard key={player.id} player={player} selected={selectedIds.has(player.id)} onClick={() => togglePlayer(player.id)} />
            ))}
          </div>
        ) : (
          <p className="mt-3 rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">No active group players. Add guests or update the pool.</p>
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

      <section className="grid gap-3 sm:grid-cols-2">
        <FieldSelect id="groupFormat" label="Tournament Format" value={tournamentFormat} disabled={isSaving} onChange={(event) => setTournamentFormat(event.target.value)} options={[{ value: 'cup', label: 'Cup' }, { value: 'league', label: 'League' }]} />
        <FieldSelect id="groupCourts" label="Courts Available" value={courtCount} disabled={isSaving} onChange={(event) => setCourtCount(Number(event.target.value))} options={[{ value: 1, label: '1 court' }, { value: 2, label: '2 courts' }, { value: 3, label: '3 courts' }]} />
      </section>

      <div className="sticky bottom-3 z-10 rounded-3xl border border-white/10 bg-[#07111B]/95 p-3 shadow-2xl shadow-[#020D16]/15 backdrop-blur">
        <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
          <button type="button" onClick={() => setScreen('groupHome')} className="min-h-14 rounded-2xl border border-[rgba(255,255,255,0.08)] px-5 font-black text-[#8D99A6] hover:bg-[#07111B]">
            Back
          </button>
          <button type="button" onClick={startNight} disabled={isSaving || !setupStatus.isValid} className="min-h-14 rounded-2xl bg-[#BEDC45] px-4 text-lg font-black text-[#020D16] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.08)] disabled:text-[#8D99A6]">
            {isSaving ? 'Starting...' : setupStatus.isValid ? 'Start Group Night' : setupStatus.message}
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
        </span>
      </span>
    </button>
  );
}

function SummaryTile({ icon, label, value, detail }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#8D99A6]">
        {icon}
        <p className="text-sm font-bold">{label}</p>
      </div>
      <p className="mt-1 truncate text-3xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-1 line-clamp-2 text-xs font-bold uppercase tracking-wide text-[#8D99A6]">{detail}</p>
    </div>
  );
}

function FieldSelect({ id, label, value, disabled, onChange, options }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <label htmlFor={id} className="mb-2 block text-sm font-black uppercase tracking-wide text-[#8D99A6]">
        {label}
      </label>
      <select id={id} value={value} onChange={onChange} disabled={disabled} className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 text-base font-black text-[#F7F8F7] outline-none focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20 disabled:opacity-60">
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
