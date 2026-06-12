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
          ? 'border-[#BFD0C2] bg-[#E8F6EF]'
          : isCurrent
            ? 'border-[#BDEDEA] bg-[#E6FAF8] shadow-[#0E8F8A]/10'
            : 'border-[#DDE7DE] bg-white'
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
            className="min-h-10 rounded-2xl border border-[#DDE7DE] bg-white px-3 py-2 text-sm font-black text-[#18211C] transition hover:border-[#BDEDEA] hover:bg-[#E6FAF8]"
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
            <span className="max-w-32 rounded-2xl bg-white px-3 py-2 text-xs font-black leading-relaxed text-[#18211C] shadow-sm sm:max-w-40">
              {padelScoreSummary}
            </span>
          ) : hasScore ? (
            <>
              <ScorePill active={teamAWon}>{match.score.teamA}</ScorePill>
              <ScorePill active={teamBWon}>{match.score.teamB}</ScorePill>
            </>
          ) : (
            <span className="self-center rounded-full bg-[#F1F7F2] px-3 py-2 text-xs font-black text-[#65736A]">VS</span>
          )}
        </div>
      </div>

      {isCompleted && (
        <p className="mt-3 rounded-2xl bg-white p-2 text-center text-sm font-black text-[#146C52]">
          Winner: {teamAWon ? getTeamName(match.teamA) : getTeamName(match.teamB)}
        </p>
      )}
    </div>
  );
}

function TeamLine({ name, won }) {
  return (
    <p className={`break-words text-base font-black leading-tight ${won ? 'text-[#146C52]' : 'text-[#18211C]'}`}>
      {won && <span className="mr-2 text-[#168A5B]">Winner</span>}
      {name}
    </p>
  );
}

function ScorePill({ active, children }) {
  return (
    <span className={`rounded-2xl px-3 py-1 text-lg font-black tabular-nums ${active ? 'bg-[#168A5B] text-white' : 'bg-[#F1F7F2] text-[#65736A]'}`}>
      {children}
    </span>
  );
}

function Badge({ tone, children }) {
  const tones = {
    cyan: 'bg-[#E6FAF8] text-[#0E706B]',
    emerald: 'bg-[#E8F6EF] text-[#146C52]',
    gold: 'bg-[#FFF4D6] text-[#8A5A00]',
    slate: 'bg-[#F1F7F2] text-[#65736A]',
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${tones[tone] || tones.slate}`}>{children}</span>;
}
