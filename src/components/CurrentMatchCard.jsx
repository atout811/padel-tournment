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
      <div className="rounded-2xl border border-[#BDEDEA] bg-[#E6FAF8] px-4 py-3">
        <p className="text-sm font-black text-[#074A47]">Choose the match winner</p>
        <p className="mt-1 text-sm font-semibold text-[#0E706B]">Large buttons are intentional for quick scoring courtside.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
        <WinnerPanel
          label="Team A"
          name={getTeamName(match.teamA)}
          isWinner={selectedWinnerId === match.teamA.id}
          onChoose={() => handleWinner('teamA')}
          disabled={isSaving}
        />
        <div className="hidden items-center justify-center px-1 text-sm font-black text-[#8A978E] sm:flex">VS</div>
        <WinnerPanel
          label="Team B"
          name={getTeamName(match.teamB)}
          isWinner={selectedWinnerId === match.teamB.id}
          onChoose={() => handleWinner('teamB')}
          disabled={isSaving}
        />
      </div>

      {isSaving && (
        <div className="rounded-2xl border border-[#DDE7DE] bg-[#F7FAF5] p-3 text-center text-sm font-black text-[#65736A]">
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
        isWinner ? 'border-[#168A5B] bg-[#E8F6EF]' : 'border-[#DDE7DE] bg-white hover:border-[#BFD0C2] hover:bg-[#F1F7F2]'
      }`}
    >
      <span className="text-xs font-black uppercase tracking-[0.18em] text-[#65736A]">{label}</span>
      <span className="mx-auto mt-3 block max-w-[18rem] break-words text-2xl font-black leading-tight text-[#18211C]">{name}</span>
      <span
        className={`mx-auto mt-5 block w-full rounded-2xl px-4 py-3 text-base font-black ${
          isWinner ? 'bg-[#168A5B] text-white' : 'bg-[#F1F7F2] text-[#18211C]'
        }`}
      >
        {isWinner ? 'Winner selected' : 'This team won'}
      </span>
    </button>
  );
}
