import { summarizePadelScore } from '../utils/padelScoring';
import { useI18n } from '../i18n/useI18n.js';

const getTeamName = (team) => team.players.join(' & ');

export default function MatchCard({ match, onSetCurrent, isCurrent, setActiveHint = '' }) {
  const { t } = useI18n();
  const isCompleted = match.status === 'completed';
  const teamAWon = isCompleted && match.winnerId === match.teamA.id;
  const teamBWon = isCompleted && match.winnerId === match.teamB.id;
  const hasScore = Number.isFinite(Number(match.score?.teamA)) && Number.isFinite(Number(match.score?.teamB));
  const padelScoreSummary = summarizePadelScore(match.score, match.teamA.id, match.teamB.id);

  const getMatchTypeLabel = () => {
    if (match.matchType === 'final') return t('match.final');
    if (match.matchType === 'semifinal') return t('match.semifinal');
    return t('match.round', { round: match.round });
  };

  return (
    <div
      className={`w-full rounded-2xl border p-3 text-left shadow-sm ${
        isCompleted
          ? 'motion-complete-glow border-club-green bg-club-green/12'
          : isCurrent
            ? 'border-club-borderStrong bg-club-soft'
            : 'border-club-border bg-club-surface'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={match.matchType === 'final' ? 'gold' : match.matchType === 'semifinal' ? 'emerald' : 'slate'}>{getMatchTypeLabel()}</Badge>
          {isCurrent && <Badge tone="cyan">{t('match.current')}</Badge>}
          {isCompleted && <Badge tone="emerald">{t('match.completed')}</Badge>}
        </div>
        {!isCompleted && onSetCurrent && !isCurrent && (
          <button
            onClick={() => onSetCurrent(match)}
            className="min-h-11 shrink-0 rounded-xl border border-club-border bg-club-soft px-3 py-1.5 text-center text-xs font-black text-club-ink transition hover:border-club-borderStrong hover:bg-club-wash"
          >
            <span className="block">{t('match.setActive')}</span>
            {setActiveHint && <span className="mt-0.5 block text-[0.62rem] font-bold uppercase tracking-wide text-club-muted">{setActiveHint}</span>}
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="min-w-0">
          <TeamLine name={getTeamName(match.teamA)} won={teamAWon} align="right" t={t} />
        </div>
        <div className="grid min-w-12 content-center gap-1 text-center">
          {padelScoreSummary ? (
            <span className="max-w-24 rounded-xl bg-club-surface px-2 py-1 text-[0.65rem] font-black leading-relaxed text-club-ink shadow-sm sm:max-w-40">
              {padelScoreSummary}
            </span>
          ) : hasScore ? (
            <>
              <ScorePill active={teamAWon}>{match.score.teamA}</ScorePill>
              <ScorePill active={teamBWon}>{match.score.teamB}</ScorePill>
            </>
          ) : (
            <span className="self-center rounded-xl bg-club-wash px-2 py-1 text-[0.65rem] font-black text-club-muted">{t('match.vs')}</span>
          )}
        </div>
        <div className="min-w-0">
          <TeamLine name={getTeamName(match.teamB)} won={teamBWon} t={t} />
        </div>
      </div>

      {isCompleted && (
        <p className="mt-2 rounded-xl bg-club-surface p-2 text-center text-xs font-black text-club-green">
          {t('match.winner', { team: teamAWon ? getTeamName(match.teamA) : getTeamName(match.teamB) })}
        </p>
      )}
    </div>
  );
}

function TeamLine({ name, won, align = 'left', t }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : ''}`}>
      <p className={`break-words text-sm font-black leading-snug ${won ? 'text-club-green' : 'text-club-ink'}`} title={name}>
        {name}
      </p>
      {won && <p className="mt-0.5 text-[0.62rem] font-black uppercase tracking-wide text-club-green">{t('common.winner')}</p>}
    </div>
  );
}

function ScorePill({ active, children }) {
  return (
    <span className={`rounded-xl px-2 py-1 text-sm font-black tabular-nums ${active ? 'bg-club-green text-club-greenDeep' : 'bg-club-wash text-club-muted'}`}>
      {children}
    </span>
  );
}

function Badge({ tone, children }) {
  const tones = {
    cyan: 'bg-club-soft text-club-muted',
    emerald: 'bg-club-green/12 text-club-green',
    gold: 'bg-club-soft text-club-green',
    slate: 'bg-club-wash text-club-muted',
  };

  return <span className={`rounded-xl px-2.5 py-1 text-xs font-black uppercase tracking-wide ${tones[tone] || tones.slate}`}>{children}</span>;
}
