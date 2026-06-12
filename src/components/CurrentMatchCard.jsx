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
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <WinnerPanel
          label="Team A"
          name={getTeamName(match.teamA)}
          isWinner={selectedWinnerId === match.teamA.id}
          onChoose={() => handleWinner('teamA')}
          disabled={isSaving}
        />
        <div className="hidden items-center justify-center px-1 text-sm font-black text-[#8D99A6] sm:flex">VS</div>
        <WinnerPanel
          label="Team B"
          name={getTeamName(match.teamB)}
          isWinner={selectedWinnerId === match.teamB.id}
          onChoose={() => handleWinner('teamB')}
          disabled={isSaving}
        />
      </div>

      {isSaving && (
        <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3 text-center text-sm font-black text-[#8D99A6]">
          Saving result and loading the next safe match...
        </div>
      )}
    </div>
  );
}

function WinnerPanel({ label, name, isWinner, onChoose, disabled }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      disabled={disabled}
      className={`min-h-40 w-full rounded-3xl border-2 p-5 text-center shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-80 ${
        isWinner ? 'border-[#BEDC45] bg-[#BEDC45]/14' : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E] hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]'
      }`}
    >
      <span className="text-xs font-black uppercase tracking-[0.18em] text-[#8D99A6]">{label}</span>
      <span className="mx-auto mt-3 grid h-12 w-12 place-items-center rounded-2xl bg-[#BEDC45]/14 text-sm font-black text-[#BEDC45]">{getInitials(name)}</span>
      <span className="mx-auto mt-3 block max-w-[18rem] break-words text-2xl font-black leading-tight text-[#F7F8F7]">{name}</span>
      <span
        className={`mx-auto mt-5 block w-full rounded-2xl px-4 py-3 text-base font-black ${
          isWinner ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#F7F8F7]'
        }`}
      >
        {isWinner ? 'Winner selected' : 'This team won'}
      </span>
    </button>
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
