import { useEffect, useMemo, useRef, useState } from 'react';
import {
  advancePadelPoint,
  createInitialPadelScore,
  formatSetScore,
  getCurrentSet,
  getPointLabel,
  getSetsWon,
  getSetStatusLabel,
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

  const currentSet = getCurrentSet(score);
  const setsWon = getSetsWon(score, match.teamA.id, match.teamB.id);
  const setStatus = getSetStatusLabel(score);

  const handlePoint = (side) => {
    const nextScore = advancePadelPoint(score, side, match.teamA.id, match.teamB.id, settings);
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
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{setStatus}</p>
        <p className="mt-1 text-sm font-semibold text-slate-300">
          Points win sets. First to {settings.setsToWin} set{settings.setsToWin > 1 ? 's' : ''} wins.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <TeamScorePanel
          label="Team A"
          name={getTeamName(match.teamA)}
          setsWon={setsWon.teamA}
          pointLabel={getPointLabel(currentSet?.teamAPoints || 0, currentSet?.teamBPoints || 0, settings.deuceMode)}
          isWinner={score.winnerId === match.teamA.id}
          onPoint={() => handlePoint('teamA')}
          disabled={score.isComplete}
        />
        <div className="hidden items-center justify-center px-2 text-sm font-black text-slate-500 sm:flex">VS</div>
        <TeamScorePanel
          label="Team B"
          name={getTeamName(match.teamB)}
          setsWon={setsWon.teamB}
          pointLabel={getPointLabel(currentSet?.teamBPoints || 0, currentSet?.teamAPoints || 0, settings.deuceMode)}
          isWinner={score.winnerId === match.teamB.id}
          onPoint={() => handlePoint('teamB')}
          disabled={score.isComplete}
        />
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-950 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-300">
            Set {score.currentSetIndex + 1} of {settings.maxSets}
          </p>
          <div className="flex flex-wrap gap-2">
            {score.sets.map((set, index) => (
              <span
                key={index}
                className={`rounded px-2 py-1 text-xs font-bold ${index === score.currentSetIndex ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-300'}`}
              >
                S{index + 1}: {formatSetScore(set)}
              </span>
            ))}
          </div>
        </div>
      </div>

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
        Undo Point
      </button>
    </div>
  );
}

function TeamScorePanel({ label, name, setsWon, pointLabel, isWinner, onPoint, disabled }) {
  return (
    <div className={`rounded-lg border p-3 ${isWinner ? 'border-amber-300 bg-amber-400/10' : 'border-slate-700 bg-slate-800'}`}>
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="break-words text-lg font-bold leading-tight text-white">{name}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-center">
        <ScoreBox label="Points" value={pointLabel} isPrimary />
        <ScoreBox label="Sets" value={setsWon} />
      </div>
      <button
        type="button"
        onClick={onPoint}
        disabled={disabled}
        className="mt-3 min-h-12 w-full rounded-lg bg-emerald-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
      >
        Add Point
      </button>
    </div>
  );
}

function ScoreBox({ label, value, isPrimary = false }) {
  return (
    <div className={`rounded-lg bg-slate-950 p-2 ${isPrimary ? 'ring-1 ring-emerald-500/40' : ''}`}>
      <p className={`${isPrimary ? 'text-3xl' : 'text-2xl'} min-h-10 break-words font-black tabular-nums text-white`}>{value}</p>
      <p className="text-xs font-semibold text-slate-500">{label}</p>
    </div>
  );
}
