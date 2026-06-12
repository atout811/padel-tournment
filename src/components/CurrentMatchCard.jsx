import { useEffect, useState } from 'react';

const getTeamName = (team) => team.players.join(' & ');

export default function CurrentMatchCard({ match, onDeclareWinner }) {
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWinnerId, setSelectedWinnerId] = useState('');

  useEffect(() => {
    setIsSaving(false);
    setSelectedWinnerId('');
  }, [match.id]);

  const handleWinner = async (side) => {
    if (isSaving) return;

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
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl bg-[#07111B] px-3 py-2">
        <TeamName name={getTeamName(match.teamA)} align="right" />
        <span className="rounded-full bg-[#0A141E] px-2 py-1 text-[0.65rem] font-black text-[#8D99A6]">VS</span>
        <TeamName name={getTeamName(match.teamB)} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <WinnerButton
          label="Team A won"
          name={getTeamName(match.teamA)}
          isWinner={selectedWinnerId === match.teamA.id}
          onChoose={() => handleWinner('teamA')}
          disabled={isSaving}
        />
        <WinnerButton
          label="Team B won"
          name={getTeamName(match.teamB)}
          isWinner={selectedWinnerId === match.teamB.id}
          onChoose={() => handleWinner('teamB')}
          disabled={isSaving}
        />
      </div>

      {isSaving && (
        <div className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] px-3 py-2 text-center text-xs font-black text-[#8D99A6]">
          Saving result...
        </div>
      )}
    </div>
  );
}

function TeamName({ name, align = 'left' }) {
  return (
    <span className={`min-w-0 truncate text-sm font-black text-[#F7F8F7] ${align === 'right' ? 'text-right' : ''}`} title={name}>
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
      className={`min-h-12 rounded-xl border px-2 py-2 text-center shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 ${
        isWinner ? 'border-[#BEDC45] bg-[#BEDC45] text-[#020D16]' : 'border-[#BEDC45]/45 bg-[#BEDC45]/14 text-[#BEDC45] hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]'
      }`}
    >
      <span className="block truncate text-xs font-black uppercase tracking-wide">{label}</span>
      <span className="mt-0.5 block truncate text-[0.68rem] font-bold opacity-80">{name}</span>
    </button>
  );
}
