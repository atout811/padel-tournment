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
      className={`w-full rounded-2xl border p-3 text-left shadow-sm ${
        isCompleted
          ? 'border-[#BEDC45] bg-[#BEDC45]/14'
          : isCurrent
            ? 'border-[#1F60D1] bg-[#1F60D1]/16 shadow-[#1F60D1]/10'
            : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E]'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={match.matchType === 'final' ? 'gold' : match.matchType === 'semifinal' ? 'emerald' : 'slate'}>{getMatchTypeLabel()}</Badge>
          {isCurrent && <Badge tone="cyan">Current</Badge>}
          {isCompleted && <Badge tone="emerald">Completed</Badge>}
        </div>
        {!isCompleted && onSetCurrent && !isCurrent && (
          <button
            onClick={() => onSetCurrent(match)}
            className="min-h-9 shrink-0 rounded-xl bg-[#1F60D1] px-3 py-1.5 text-xs font-black text-white transition hover:bg-[#2F73E6]"
          >
            Court
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <TeamLine name={getTeamName(match.teamA)} won={teamAWon} align="right" />
        </div>
        <div className="grid min-w-12 content-center gap-1 text-center">
          {padelScoreSummary ? (
            <span className="max-w-24 rounded-xl bg-[#0A141E] px-2 py-1 text-[0.65rem] font-black leading-relaxed text-[#F7F8F7] shadow-sm sm:max-w-40">
              {padelScoreSummary}
            </span>
          ) : hasScore ? (
            <>
              <ScorePill active={teamAWon}>{match.score.teamA}</ScorePill>
              <ScorePill active={teamBWon}>{match.score.teamB}</ScorePill>
            </>
          ) : (
            <span className="self-center rounded-full bg-[#07111B] px-2 py-1 text-[0.65rem] font-black text-[#8D99A6]">VS</span>
          )}
        </div>
        <div className="min-w-0">
          <TeamLine name={getTeamName(match.teamB)} won={teamBWon} />
        </div>
      </div>

      {isCompleted && (
        <p className="mt-2 rounded-xl bg-[#0A141E] p-2 text-center text-xs font-black text-[#BEDC45]">
          Winner: {teamAWon ? getTeamName(match.teamA) : getTeamName(match.teamB)}
        </p>
      )}
    </div>
  );
}

function TeamLine({ name, won, align = 'left' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className={`truncate text-sm font-black leading-tight ${won ? 'text-[#BEDC45]' : 'text-[#F7F8F7]'}`} title={name}>
        {name}
      </p>
      {won && <p className="mt-0.5 text-[0.62rem] font-black uppercase tracking-wide text-[#BEDC45]">Winner</p>}
    </div>
  );
}

function ScorePill({ active, children }) {
  return (
    <span className={`rounded-xl px-2 py-1 text-sm font-black tabular-nums ${active ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
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
