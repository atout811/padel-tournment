import React, { useMemo, useState } from 'react';
import { createTournamentRecord } from '../utils/tournamentService';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import { buildTournament } from '../utils/tournamentBuilder';
import { CheckIcon, CourtIcon, ListIcon, TrophyIcon, UsersIcon, XIcon } from '../components/Icons';

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup');
  const [scoringPreset, setScoringPreset] = useState('standard');
  const [maxSets, setMaxSets] = useState(3);
  const [deuceMode, setDeuceMode] = useState('advantage');
  const [courtCount, setCourtCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const setupStatus = useMemo(() => getSetupStatus(players, tournamentFormat), [players, tournamentFormat]);
  const hasOddPlayer = players.length % 2 !== 0;

  const applyPreset = (preset) => {
    setScoringPreset(preset);
    if (preset === 'fast') {
      setMaxSets(1);
      setDeuceMode('golden');
    } else {
      setMaxSets(3);
      setDeuceMode('advantage');
    }
  };

  const handleAddPlayer = () => {
    const validation = validatePlayerName(playerName, players);
    if (!validation.isValid) {
      setPlayerError(validation.message);
      showAlert('Check Player Name', validation.message);
      return;
    }

    setPlayers([...players, validation.name]);
    setPlayerName('');
    setPlayerError('');
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers(players.filter((player) => player !== nameToRemove));
    setPlayerError('');
  };

  const handleCreateTournament = async () => {
    const currentStatus = getSetupStatus(players, tournamentFormat);
    if (!currentStatus.isValid) {
      showAlert('Tournament Not Ready', currentStatus.message);
      return;
    }

    setIsSaving(true);

    const newTournament = buildTournament({
      players,
      format: tournamentFormat,
      scoringPreset,
      maxSets,
      deuceMode,
      courtCount,
    });

    try {
      const createdTournament = await createTournamentRecord(newTournament);
      setTournament(createdTournament);
      setScreen('tournament');
    } catch (error) {
      console.error('Error creating tournament:', error);
      showAlert('Error', 'Could not save the tournament. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-4 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="rounded-3xl bg-gradient-to-br from-club-greenDeep via-[#19232B] to-club-teal p-5 text-white shadow-lg shadow-club-greenDeep/15">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#CFD2D3]">Padel Tournament Pro</p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">Set up the next match day</h2>
        <p className="mt-2 max-w-2xl text-sm font-medium text-[#BEDC45]">
          Add players, pick a format, choose available courts, and start with a schedule players can follow from their phones.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <SummaryTile icon={<UsersIcon />} label="Players" value={players.length} detail={`${setupStatus.minPlayers}+ needed`} />
        <SummaryTile icon={<UsersIcon />} label="Teams" value={setupStatus.teamCount} detail={hasOddPlayer ? 'includes substitute' : 'paired players'} />
        <SummaryTile icon={<CourtIcon />} label="Courts" value={courtCount} detail={courtCount === 1 ? 'single court' : `${courtCount} active courts`} />
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#F7F8F7]">Tournament Format</h3>
            <p className="mt-1 text-sm font-medium text-[#8D99A6]">Cup needs 8 players. League can start with 4.</p>
          </div>
          <StatusPill ready={setupStatus.isValid} text={setupStatus.isValid ? 'Ready' : 'Needs players'} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard
            title="Cup"
            eyebrow="Group stage to final"
            description="Top 4 teams qualify for semifinals, then a champion match."
            icon={<TrophyIcon />}
            selected={tournamentFormat === 'cup'}
            onClick={() => setTournamentFormat('cup')}
          />
          <ChoiceCard
            title="League"
            eyebrow="Two round-robin legs"
            description="Every team gets repeat matches and standings decide the winner."
            icon={<ListIcon />}
            selected={tournamentFormat === 'league'}
            onClick={() => setTournamentFormat('league')}
          />
        </div>
        <p className={`mt-3 rounded-2xl px-3 py-2 text-sm font-bold ${setupStatus.isValid ? 'bg-[#BEDC45]/14 text-[#BEDC45]' : 'bg-[#19232B] text-[#BEDC45]'}`}>
          {setupStatus.message}
        </p>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-black text-[#F7F8F7]">Players</h3>
            <p className="text-sm font-medium text-[#8D99A6]">Names are trimmed and checked for duplicates.</p>
          </div>
          <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black text-[#BEDC45]">{players.length}</span>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex-1">
            <input
              type="text"
              className={`min-h-14 w-full rounded-2xl border bg-[#0A141E] px-4 text-base font-semibold text-[#F7F8F7] outline-none transition focus:ring-4 ${
                playerError ? 'border-[#DB4145]/50 focus:border-[#DB4145] focus:ring-[#DB4145]/20' : 'border-[rgba(255,255,255,0.08)] focus:border-[#BEDC45] focus:ring-[#BEDC45]/20'
              }`}
              placeholder="Player name"
              value={playerName}
              maxLength={40}
              onChange={(event) => {
                setPlayerName(event.target.value);
                if (playerError) setPlayerError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddPlayer();
                }
              }}
            />
            {playerError && <p className="mt-2 text-sm font-bold text-[#DB4145]">{playerError}</p>}
          </div>
          <button
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-6 text-base font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20 transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAddPlayer}
            disabled={isSaving}
          >
            <UsersIcon className="h-5 w-5" />
            Add Player
          </button>
        </div>

        <div className="mt-4">
          {players.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {players.map((player, index) => (
                <PlayerChip key={player} index={index + 1} name={player} onRemove={() => handleRemovePlayer(player)} disabled={isSaving} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center">
              <p className="text-base font-black text-[#F7F8F7]">No players yet</p>
              <p className="mt-1 text-sm font-medium text-[#8D99A6]">Add at least four players for League or eight for Cup.</p>
            </div>
          )}
        </div>

        {hasOddPlayer && (
          <p className="mt-3 rounded-2xl bg-[#1F60D1]/16 px-3 py-2 text-sm font-bold text-[#CFD2D3]">
            Odd player count: one random player will be paired with a substitute slot.
          </p>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
          <label htmlFor="courtCount" className="mb-2 block text-sm font-black uppercase tracking-wide text-[#8D99A6]">
            Courts Available
          </label>
          <select
            id="courtCount"
            value={courtCount}
            onChange={(event) => setCourtCount(Number(event.target.value))}
            disabled={isSaving}
            className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] px-4 text-base font-black text-[#F7F8F7] outline-none focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value={1}>1 court</option>
            <option value={2}>2 courts</option>
            <option value={3}>3 courts</option>
          </select>
        </div>

        <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvanced((value) => !value)}
            className="min-h-14 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] px-4 text-left text-base font-black text-[#F7F8F7] transition hover:bg-[#07111B]"
          >
            {showAdvanced ? 'Hide scoring options' : 'Scoring options'}
          </button>
        </div>
      </section>

      {showAdvanced && (
        <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <ChoiceCard
              title="Classic"
              eyebrow="Best of 3"
              description="Casual sets with advantage at deuce."
              selected={scoringPreset === 'standard'}
              onClick={() => applyPreset('standard')}
            />
            <ChoiceCard
              title="Quick"
              eyebrow="Best of 1"
              description="Short match with golden point."
              selected={scoringPreset === 'fast'}
              onClick={() => applyPreset('fast')}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FieldSelect
              id="maxSets"
              label="Match Length"
              value={maxSets}
              disabled={isSaving}
              onChange={(event) => {
                setMaxSets(Number(event.target.value));
                setScoringPreset('custom');
              }}
              options={[
                { value: 1, label: 'Best of 1 set' },
                { value: 3, label: 'Best of 3 sets' },
                { value: 5, label: 'Best of 5 sets' },
              ]}
            />
            <FieldSelect
              id="deuceMode"
              label="Deuce Rule"
              value={deuceMode}
              disabled={isSaving}
              onChange={(event) => {
                setDeuceMode(event.target.value);
                setScoringPreset('custom');
              }}
              options={[
                { value: 'advantage', label: 'Advantage at deuce' },
                { value: 'golden', label: 'Golden point at deuce' },
              ]}
            />
          </div>
        </section>
      )}

      <div className="sticky bottom-3 z-10 rounded-3xl border border-white/10 bg-[#07111B]/95 p-3 shadow-2xl shadow-[#020D16]/15 backdrop-blur">
        <button
          className="min-h-14 w-full rounded-2xl bg-[#BEDC45] px-4 text-lg font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20 transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.08)] disabled:text-[#8D99A6] disabled:shadow-none"
          onClick={handleCreateTournament}
          disabled={isSaving || !setupStatus.isValid}
        >
          {isSaving ? 'Creating...' : 'Start Tournament'}
        </button>
      </div>
    </div>
  );
}

function SummaryTile({ icon, label, value, detail }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[#8D99A6]">
        {icon}
        <p className="text-sm font-bold">{label}</p>
      </div>
      <p className="mt-1 text-3xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#8D99A6]">{detail}</p>
    </div>
  );
}

function StatusPill({ ready, text }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${ready ? 'bg-[#BEDC45]/14 text-[#BEDC45]' : 'bg-[#19232B] text-[#BEDC45]'}`}>
      {text}
    </span>
  );
}

function ChoiceCard({ title, eyebrow, description, icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-32 rounded-3xl border p-4 text-left transition active:scale-[0.99] ${
        selected ? 'border-[#BEDC45] bg-[#BEDC45]/14 shadow-[0_0_0_4px_rgba(22,138,91,0.12)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E] hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${selected ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
          {selected ? 'Selected' : eyebrow}
        </span>
        {icon && <span className={`grid h-10 w-10 place-items-center rounded-2xl ${selected ? 'bg-[#0A141E] text-[#BEDC45]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{icon}</span>}
      </div>
      <span className="mt-3 flex items-center gap-2 text-xl font-black text-[#F7F8F7]">
        {selected && <CheckIcon className="h-5 w-5 text-[#BEDC45]" />}
        {title}
      </span>
      <span className="mt-1 block text-sm font-semibold leading-relaxed text-[#8D99A6]">{description}</span>
    </button>
  );
}

function PlayerChip({ index, name, onRemove, disabled }) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] py-2 pl-2 pr-1 shadow-sm">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#BEDC45] text-xs font-black text-[#020D16]">{getInitials(name) || index}</span>
      <span className="min-w-0 truncate text-sm font-black text-[#F7F8F7]">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[#8D99A6] transition hover:bg-[#DB4145]/10 hover:text-[#DB4145] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}


function FieldSelect({ id, label, value, disabled, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-black uppercase tracking-wide text-[#8D99A6]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="min-h-12 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 text-base font-bold text-[#F7F8F7] outline-none focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
