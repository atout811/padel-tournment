import { useEffect, useMemo, useRef, useState } from 'react';
import {
  awardPadelSet,
  createInitialPadelScore,
  formatSetScore,
  getSetsWon,
  normalizeScoringSettings,
} from '../utils/padelScoring';

const getTeamName = (team) => team.players.join(' & ');

export default function CurrentMatchCard({ match, onDeclareWinner, onScoreChange, scoringSettings }) {
  const settings = useMemo(() => normalizeScoringSettings(scoringSettings), [scoringSettings]);
  const [score, setScore] = useState(() => createInitialPadelScore(settings));
  const [history, setHistory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const autoSaveKeyRef = useRef('');
  const loadedMatchIdRef = useRef('');

  useEffect(() => {
    const isNewMatch = loadedMatchIdRef.current !== match.id;
    const incomingScore = match.score?.sets && !match.score?.isComplete ? { ...match.score, settings } : createInitialPadelScore(settings);

    setScore((current) => {
      if (isNewMatch || JSON.stringify(current) !== JSON.stringify(incomingScore)) {
        return incomingScore;
      }
      return current;
    });

    if (isNewMatch) {
      setHistory([]);
      setIsSaving(false);
      autoSaveKeyRef.current = '';
      loadedMatchIdRef.current = match.id;
    }
  }, [match.id, match.score, settings]);

  const setsWon = getSetsWon(score, match.teamA.id, match.teamB.id);
  const completedSets = score.sets.filter((set) => set.winnerId);

  const handleAwardSet = (side) => {
    const nextScore = awardPadelSet(score, side, match.teamA.id, match.teamB.id, settings);
    setHistory((historyItems) => [...historyItems, score]);
    setScore(nextScore);
    if (!nextScore.isComplete) {
      onScoreChange?.(match, nextScore);
    }
  };

  const handleUndo = () => {
    setHistory((current) => {
      if (current.length === 0) return current;
      const previous = current[current.length - 1];
      setScore(previous);
      onScoreChange?.(match, previous);
      return current.slice(0, -1);
    });
  };

  useEffect(() => {
    if (!score.isComplete || !score.winnerId) {
      return;
    }

    const autoSaveKey = `${match.id}:${score.winnerId}:${score.sets.map((set) => `${set.teamAPoints}-${set.teamBPoints}-${set.winnerId || ''}`).join('|')}`;
    if (autoSaveKeyRef.current === autoSaveKey) {
      return;
    }

    autoSaveKeyRef.current = autoSaveKey;
    setIsSaving(true);
    onDeclareWinner(match, { winnerId: score.winnerId, score }).finally(() => {
      setIsSaving(false);
    });
  }, [match, onDeclareWinner, score]);

  return (
    <div className="space-y-4 rounded-lg bg-slate-900">
      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-center">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Set Entry</p>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          Tap the team that wins a set. First to {settings.setsToWin} set{settings.setsToWin > 1 ? 's' : ''} wins the match.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <TeamSetPanel
          label="Team A"
          name={getTeamName(match.teamA)}
          setsWon={setsWon.teamA}
          targetSets={settings.setsToWin}
          isWinner={score.winnerId === match.teamA.id}
          onAwardSet={() => handleAwardSet('teamA')}
          disabled={score.isComplete || isSaving}
        />
        <div className="hidden items-center justify-center px-2 text-sm font-black text-slate-500 sm:flex">VS</div>
        <TeamSetPanel
          label="Team B"
          name={getTeamName(match.teamB)}
          setsWon={setsWon.teamB}
          targetSets={settings.setsToWin}
          isWinner={score.winnerId === match.teamB.id}
          onAwardSet={() => handleAwardSet('teamB')}
          disabled={score.isComplete || isSaving}
        />
      </div>

      {completedSets.length > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Sets</p>
          <div className="flex flex-wrap gap-2">
            {completedSets.map((set, index) => (
              <span key={index} className="rounded bg-slate-800 px-2 py-1 text-xs font-bold text-slate-300">
                S{index + 1}: {formatSetScore(set)}
              </span>
            ))}
          </div>
        </div>
      )}

      {score.isComplete ? (
        <div className="rounded-lg border border-amber-300/60 bg-amber-400/10 p-3 text-center">
          <p className="text-sm font-bold text-amber-200">
            Match winner: {score.winnerId === match.teamA.id ? getTeamName(match.teamA) : getTeamName(match.teamB)}
          </p>
          <p className="mt-1 text-xs font-semibold text-amber-100/80">
            {isSaving ? 'Saving result and moving to the next match...' : 'Result saved. Loading next match...'}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleUndo}
        disabled={history.length === 0 || isSaving || score.isComplete}
        className="min-h-12 w-full rounded-lg border border-slate-600 px-4 py-3 font-bold text-slate-200 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Undo Set
      </button>
    </div>
  );
}

function TeamSetPanel({ label, name, setsWon, targetSets, isWinner, onAwardSet, disabled }) {
  return (
    <div className={`rounded-lg border p-3 ${isWinner ? 'border-amber-300 bg-amber-400/10' : 'border-slate-700 bg-slate-800'}`}>
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-lg font-bold leading-tight text-white">{name}</p>
      </div>
      <div className="rounded-lg bg-slate-950 p-4 text-center">
        <p className="text-5xl font-black tabular-nums text-white">{setsWon}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">of {targetSets} sets</p>
      </div>
      <button
        type="button"
        onClick={onAwardSet}
        disabled={disabled}
        className="mt-3 min-h-12 w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        + Set
      </button>
    </div>
  );
}
