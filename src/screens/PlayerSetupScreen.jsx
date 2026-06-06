import React, { useMemo, useState } from 'react';
import { createTournamentRecord } from '../utils/tournamentService';
import { distributeMatchesFairly, generateLeagueMatches } from '../utils/scheduling';
import { buildScoringSettings } from '../utils/padelScoring';

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup');
  const [scoringPreset, setScoringPreset] = useState('standard');
  const [maxSets, setMaxSets] = useState(3);
  const [deuceMode, setDeuceMode] = useState('advantage');
  const [courtCount, setCourtCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const teamCount = useMemo(() => Math.floor(players.length / 2), [players.length]);
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
    const trimmedName = playerName.trim();
    if (trimmedName && !players.includes(trimmedName)) {
      setPlayers([...players, trimmedName]);
      setPlayerName('');
    } else {
      showAlert('Invalid Name', 'Player name cannot be empty or a duplicate.');
    }
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers(players.filter((p) => p !== nameToRemove));
  };

  const generateMatches = (teams, format) => {
    const matches = [];
    if (format === 'league') {
      return generateLeagueMatches(teams);
    }
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({ id: `round1_match_${i}_${j}`, round: 1, teamA: teams[i], teamB: teams[j], winnerId: null, status: 'pending' });
      }
    }
    return distributeMatchesFairly(matches);
  };

  const handleCreateTournament = async () => {
    if (players.length < 4) {
      showAlert('Not Enough Players', 'You need at least 4 players to start a tournament.');
      return;
    }

    setIsSaving(true);

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < Math.floor(shuffledPlayers.length / 2) * 2; i += 2) {
      teams.push({ id: `team_${i / 2 + 1}`, players: [shuffledPlayers[i], shuffledPlayers[i + 1]], points: 0 });
    }
    if (shuffledPlayers.length % 2 !== 0) {
      teams.push({ id: `team_${teams.length + 1}`, players: [shuffledPlayers[shuffledPlayers.length - 1], 'Substitute'], points: 0 });
    }

    const matches = generateMatches(teams, tournamentFormat);
    const scoringSettings = buildScoringSettings({ maxSets, deuceMode });

    const newTournament = {
      players,
      teams,
      matches,
      substitute: null,
      status: 'active',
      currentRound: 1,
      maxRounds: 2,
      format: tournamentFormat,
      scoringPreset,
      scoringSettings,
      courtCount,
      createdAt: new Date().toISOString(),
      currentMatchId: matches.find((m) => m.round === 1 && m.status === 'pending')?.id || null,
    };

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
    <div className="space-y-5 rounded-b-lg border-x border-b border-slate-800 bg-slate-900 p-4 sm:p-6">
      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Create a Padel Night</h2>
            <p className="text-sm text-slate-400">Add friends, pick a format, and start playing.</p>
          </div>
          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-300">
            {players.length} players / {teamCount} teams
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            className="min-h-12 flex-grow rounded-lg border border-slate-600 bg-slate-800 p-3 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30"
            placeholder="Enter player name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAddPlayer();
              }
            }}
          />
          <button
            className="min-h-12 rounded-lg bg-emerald-600 px-6 py-3 font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleAddPlayer}
            disabled={isSaving}
          >
            Add Player
          </button>
        </div>
      </section>

      <section className="space-y-2">
        {players.length > 0 ? (
          players.map((item, index) => (
            <div key={item} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-bold text-emerald-300">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-base font-semibold">{item}</span>
              <button
                onClick={() => handleRemovePlayer(item)}
                disabled={isSaving}
                className="min-h-10 rounded-lg border border-red-500/40 px-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Remove
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-slate-400">
            No players added yet.
          </div>
        )}
        {hasOddPlayer && <p className="text-sm text-amber-300">Odd player count: the last player will be paired with a substitute slot.</p>}
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          title="Cup"
          description="Everyone plays, top 4 go to semifinals and final."
          selected={tournamentFormat === 'cup'}
          onClick={() => setTournamentFormat('cup')}
        />
        <ChoiceCard
          title="League"
          description="Every team plays every other team twice."
          selected={tournamentFormat === 'league'}
          onClick={() => setTournamentFormat('league')}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <ChoiceCard
          title="Standard"
          description="Best of 3 casual sets, advantage at deuce."
          selected={scoringPreset === 'standard'}
          onClick={() => applyPreset('standard')}
        />
        <ChoiceCard
          title="Fast"
          description="One casual set, golden point at deuce."
          selected={scoringPreset === 'fast'}
          onClick={() => applyPreset('fast')}
        />
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <label htmlFor="courtCount" className="mb-2 block text-sm font-bold text-slate-300">
          Courts Available
        </label>
        <select
          id="courtCount"
          value={courtCount}
          onChange={(e) => setCourtCount(Number(e.target.value))}
          disabled={isSaving}
          className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <option value={1}>1 court</option>
          <option value={2}>2 courts</option>
          <option value={3}>3 courts</option>
        </select>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-950 p-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((value) => !value)}
          className="min-h-10 w-full rounded-lg border border-slate-600 px-3 text-sm font-bold text-slate-200 hover:bg-slate-800"
        >
          {showAdvanced ? 'Hide Advanced Scoring' : 'Advanced Scoring'}
        </button>

        {showAdvanced && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="maxSets" className="mb-2 block text-sm font-bold text-slate-300">
                Match Length
              </label>
              <select
                id="maxSets"
                value={maxSets}
                onChange={(e) => {
                  setMaxSets(Number(e.target.value));
                  setScoringPreset('custom');
                }}
                disabled={isSaving}
                className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value={1}>Best of 1 set</option>
                <option value={3}>Best of 3 sets</option>
                <option value={5}>Best of 5 sets</option>
              </select>
            </div>

            <div>
              <label htmlFor="deuceMode" className="mb-2 block text-sm font-bold text-slate-300">
                Deuce Rule
              </label>
              <select
                id="deuceMode"
                value={deuceMode}
                onChange={(e) => {
                  setDeuceMode(e.target.value);
                  setScoringPreset('custom');
                }}
                disabled={isSaving}
                className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="advantage">Advantage at deuce</option>
                <option value="golden">Golden point at deuce</option>
              </select>
            </div>
          </div>
        )}
      </section>

      <button
        className="min-h-12 w-full rounded-lg bg-emerald-600 px-4 py-3 text-lg font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
        onClick={handleCreateTournament}
        disabled={isSaving}
      >
        {isSaving ? 'Creating...' : 'Create Tournament'}
      </button>
    </div>
  );
}

function ChoiceCard({ title, description, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-24 rounded-lg border p-4 text-left transition-colors ${
        selected ? 'border-emerald-400 bg-emerald-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-500'
      }`}
    >
      <span className="block text-lg font-bold text-white">{title}</span>
      <span className="mt-1 block text-sm text-slate-400">{description}</span>
    </button>
  );
}
