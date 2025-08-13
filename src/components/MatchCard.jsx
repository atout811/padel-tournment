export default function MatchCard({ match, onSetCurrent, isCurrent }) {
  const isCompleted = match.status === 'completed';
  const teamAWon = isCompleted && match.winnerId === match.teamA.id;
  const teamBWon = isCompleted && match.winnerId === match.teamB.id;

  const getMatchTypeLabel = () => {
    if (match.matchType === 'final') return '🏆 FINAL';
    if (match.matchType === 'semifinal') return '⚡ SEMIFINAL';
    return `Round ${match.round}`;
  };

  const getMatchTypeColor = () => {
    if (match.matchType === 'final') return 'bg-yellow-600';
    if (match.matchType === 'semifinal') return 'bg-purple-600';
    return 'bg-blue-600';
  };

  return (
    <div className={`w-full text-left p-4 rounded-lg ${isCompleted ? 'bg-gray-700 opacity-60' : isCurrent ? 'bg-blue-900' : 'bg-gray-800'}`}>
      <div className="flex justify-between items-center mb-2">
        <span className={`text-xs font-bold px-2 py-1 rounded ${getMatchTypeColor()} text-white`}>{getMatchTypeLabel()}</span>
        <div className="flex items-center gap-2">
          {!isCompleted && onSetCurrent && !isCurrent && (
            <button
              onClick={() => onSetCurrent(match)}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1 rounded"
            >
              Set as Current
            </button>
          )}
          {isCompleted && <span className="text-xs text-green-400 font-bold">✓ COMPLETED</span>}
        </div>
      </div>
      <p className={`text-lg ${teamAWon ? 'text-yellow-400 font-bold' : ''}`}>{match.teamA.players.join(' & ')}</p>
      <p className="text-center text-gray-400 font-bold my-1">VS</p>
      <p className={`text-lg ${teamBWon ? 'text-yellow-400 font-bold' : ''}`}>{match.teamB.players.join(' & ')}</p>
      {isCompleted && (
        <p className="text-center mt-2 text-yellow-400 font-bold">
          Winner: {teamAWon ? match.teamA.players.join(' & ') : match.teamB.players.join(' & ')}
        </p>
      )}
    </div>
  );
}


