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

  return (
    <div
      className={`w-full rounded-3xl border p-4 text-left shadow-sm ${
        isCompleted
          ? 'border-[#BEDC45] bg-[#BEDC45]/14'
          : isCurrent
            ? 'border-[#1F60D1] bg-[#1F60D1]/16 shadow-[#1F60D1]/10'
            : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E]'
      }`}
    >
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={match.matchType === 'final' ? 'gold' : match.matchType === 'semifinal' ? 'emerald' : 'slate'}>{getMatchTypeLabel()}</Badge>
          {isCurrent && <Badge tone="cyan">Current</Badge>}
          {isCompleted && <Badge tone="emerald">Completed</Badge>}
        </div>
        {!isCompleted && onSetCurrent && !isCurrent && (
          <button
            onClick={() => onSetCurrent(match)}
            className="min-h-10 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] px-3 py-2 text-sm font-black text-[#F7F8F7] transition hover:border-[#1F60D1] hover:bg-[#1F60D1]/16"
          >
            Put on court
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="min-w-0 space-y-2">
          <TeamLine name={getTeamName(match.teamA)} won={teamAWon} />
          <TeamLine name={getTeamName(match.teamB)} won={teamBWon} />
        </div>
        <div className="grid min-w-14 content-center gap-2 text-center">
          {padelScoreSummary ? (
            <span className="max-w-32 rounded-2xl bg-[#0A141E] px-3 py-2 text-xs font-black leading-relaxed text-[#F7F8F7] shadow-sm sm:max-w-40">
              {padelScoreSummary}
            </span>
          ) : hasScore ? (
            <>
              <ScorePill active={teamAWon}>{match.score.teamA}</ScorePill>
              <ScorePill active={teamBWon}>{match.score.teamB}</ScorePill>
            </>
          ) : (
            <span className="self-center rounded-full bg-[#07111B] px-3 py-2 text-xs font-black text-[#8D99A6]">VS</span>
          )}
        </div>
      </div>

      {isCompleted && (
        <p className="mt-3 rounded-2xl bg-[#0A141E] p-2 text-center text-sm font-black text-[#BEDC45]">
          Winner: {teamAWon ? getTeamName(match.teamA) : getTeamName(match.teamB)}
        </p>
      )}
    </div>
  );
}

function TeamLine({ name, won }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black ${won ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
        {getInitials(name)}
      </span>
      <p className={`break-words text-base font-black leading-tight ${won ? 'text-[#BEDC45]' : 'text-[#F7F8F7]'}`}>
        {won && <span className="mr-2 text-[#BEDC45]">Winner</span>}
        {name}
      </p>
    </div>
  );
}

function getInitials(name) {
  return name
    .split('&')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function ScorePill({ active, children }) {
  return (
    <span className={`rounded-2xl px-3 py-1 text-lg font-black tabular-nums ${active ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
      {children}
    </span>
  );
}

function Badge({ tone, children }) {
  const tones = {
    cyan: 'bg-[#1F60D1]/16 text-[#CFD2D3]',
    emerald: 'bg-[#BEDC45]/14 text-[#BEDC45]',
    gold: 'bg-[#19232B] text-[#BEDC45]',
    slate: 'bg-[#07111B] text-[#8D99A6]',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${tones[tone] || tones.slate}`}>{children}</span>;
}
