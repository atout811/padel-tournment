import { summarizePadelScore } from '../utils/padelScoring';

const getTeamName = (team) => team.players.join(' & ');

export default function MatchCard({ match, onSetCurrent, isCurrent }) {
  const isCompleted = match.status === 'completed';
  const teamAWon = isCompleted && match.winnerId === match.teamA.id;
  const teamBWon = isCompleted && match.winnerId === match.teamB.id;
  const hasScore = Number.isFinite(Number(match.score?.teamA)) && Number.isFinite(Number(match.score?.teamB));
  const padelScoreSummary = summarizePadelScore(match.score, match.teamA.id, match.teamB.id);

  const getMatchTypeLabel = () => {
    if (match.matchType === 'final') return 'Final';
    if (match.matchType === 'semifinal') return 'Semifinal';
    return `Round ${match.round}`;
  };

  const getMatchTypeColor = () => {
    if (match.matchType === 'final') return 'bg-amber-500 text-slate-950';
    if (match.matchType === 'semifinal') return 'bg-indigo-500 text-white';
    return 'bg-sky-600 text-white';
  };

  return (
    <div
      className={`w-full rounded-lg border p-3 text-left sm:p-4 ${
        isCompleted
          ? 'border-slate-700 bg-slate-800/80'
          : isCurrent
            ? 'border-emerald-400 bg-emerald-500/10'
            : 'border-slate-700 bg-slate-800'
      }`}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-1 text-xs font-bold ${getMatchTypeColor()}`}>{getMatchTypeLabel()}</span>
          {isCurrent && <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300">Current</span>}
          {isCompleted && <span className="rounded bg-slate-950 px-2 py-1 text-xs font-bold text-emerald-300">Completed</span>}
        </div>
        {!isCompleted && onSetCurrent && !isCurrent && (
          <button
            onClick={() => onSetCurrent(match)}
            className="min-h-10 rounded-lg bg-sky-600 px-3 py-2 text-sm font-bold text-white transition-colors hover:bg-sky-500"
          >
            Set as Current
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0 space-y-2">
          <p className={`break-words text-base font-semibold ${teamAWon ? 'text-amber-300' : 'text-white'}`}>
            {getTeamName(match.teamA)}
          </p>
          <p className={`break-words text-base font-semibold ${teamBWon ? 'text-amber-300' : 'text-white'}`}>
            {getTeamName(match.teamB)}
          </p>
        </div>
        <div className="grid min-w-12 content-center gap-2 text-center">
          {padelScoreSummary ? (
            <span className="max-w-28 rounded bg-slate-950 px-3 py-2 text-xs font-black leading-relaxed text-slate-100 sm:max-w-40">
              {padelScoreSummary}
            </span>
          ) : hasScore ? (
            <>
              <span className={`rounded bg-slate-950 px-3 py-1 text-lg font-black tabular-nums ${teamAWon ? 'text-amber-300' : 'text-slate-200'}`}>
                {match.score.teamA}
              </span>
              <span className={`rounded bg-slate-950 px-3 py-1 text-lg font-black tabular-nums ${teamBWon ? 'text-amber-300' : 'text-slate-200'}`}>
                {match.score.teamB}
              </span>
            </>
          ) : (
            <span className="self-center text-xs font-bold text-slate-500">VS</span>
          )}
        </div>
      </div>

      {isCompleted && (
        <p className="mt-3 rounded-lg bg-slate-950 p-2 text-center text-sm font-bold text-amber-300">
          Winner: {teamAWon ? getTeamName(match.teamA) : getTeamName(match.teamB)}
        </p>
      )}
    </div>
  );
}
