import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/useI18n.js';

const getTeamName = (team) => team.players.join(' & ');

export default function CurrentMatchCard({ match, onDeclareWinner, disabled = false }) {
  const { t } = useI18n();
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');

  useEffect(() => {
    setIsSaving(false);
    setSelectedWinnerId('');
  }, [match.id]);

  const handleWinner = async (side) => {
    if (isSaving || disabled) return;

    const winnerId = side === 'teamA' ? match.teamA.id : match.teamB.id;
    const score = {
      teamA: side === 'teamA' ? 1 : 0,
      teamB: side === 'teamB' ? 1 : 0,
    };

    setSelectedWinnerId(winnerId);
    setIsSaving(true);
    try {
      await onDeclareWinner(match, { winnerId, score });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-lg bg-club-wash px-3 py-2">
        <TeamName name={getTeamName(match.teamA)} align="right" />
        <span className="rounded-md bg-club-surface px-2 py-1 text-[0.65rem] font-black text-club-muted">{t('match.vs')}</span>
        <TeamName name={getTeamName(match.teamB)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <WinnerButton
          label={t('match.teamAWon')}
          name={getTeamName(match.teamA)}
          isWinner={selectedWinnerId === match.teamA.id}
          onChoose={() => handleWinner('teamA')}
          disabled={isSaving || disabled}
        />
        <WinnerButton
          label={t('match.teamBWon')}
          name={getTeamName(match.teamB)}
          isWinner={selectedWinnerId === match.teamB.id}
          onChoose={() => handleWinner('teamB')}
          disabled={isSaving || disabled}
        />
      </div>

      {isSaving && (
        <div className="rounded-lg border border-club-border bg-club-soft px-3 py-2 text-center text-xs font-black text-club-muted">
          {t('match.savingResult')}
        </div>
      )}
    </div>
  );
}

function TeamName({ name, align = 'left' }) {
  return (
    <span className={`min-w-0 truncate text-sm font-black text-club-ink ${align === 'right' ? 'text-right' : ''}`} title={name}>
      {name}
    </span>
  );
}

function WinnerButton({ label, name, isWinner, onChoose, disabled }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className={`min-h-12 rounded-lg border px-2 py-2 text-center shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 ${
        isWinner ? 'motion-score-save border-club-green bg-club-green text-club-greenDeep' : 'border-club-borderStrong bg-club-green/12 text-club-green hover:border-club-borderStrong hover:bg-club-wash'
      }`}
    >
      <span className="block truncate text-xs font-black uppercase tracking-wide">{label}</span>
      <span className="mt-0.5 block truncate text-[0.68rem] font-bold opacity-80">{name}</span>
    </button>
  );
}
