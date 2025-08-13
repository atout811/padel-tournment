export default function CurrentMatchCard({ match, onDeclareWinner }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg text-center space-y-4">
      <div>
        <p className="text-xl font-semibold">{match.teamA.players.join(' & ')}</p>
        <p className="text-gray-400 my-1 font-bold">VS</p>
        <p className="text-xl font-semibold">{match.teamB.players.join(' & ')}</p>
      </div>
      <div className="flex gap-4 justify-center">
        <button onClick={() => onDeclareWinner(match, match.teamA.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex-1">
          Winner: {match.teamA.players[0]} & {match.teamA.players[1]}
        </button>
        <button onClick={() => onDeclareWinner(match, match.teamB.id)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex-1">
          Winner: {match.teamB.players[0]} & {match.teamB.players[1]}
        </button>
      </div>
    </div>
  );
}


