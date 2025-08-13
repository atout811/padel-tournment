import React from 'react';
import { saveTournamentData } from '../../utils/storage';

export default function GameHistoryModal({ tournament, setTournament, onClose, showAlert }) {
  const completedMatches = tournament.matches.filter((m) => m.status === 'completed');

  const handleWinnerChange = async (match, newWinnerId) => {
    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex === -1) return;
    const oldWinnerId = updatedTournament.matches[matchIndex].winnerId;
    updatedTournament.matches[matchIndex].winnerId = newWinnerId || null;
    if (!newWinnerId) {
      // If resetting winner, also reset status to pending so it can be replayed
      updatedTournament.matches[matchIndex].status = 'pending';
    }
    if (oldWinnerId) {
      const oldWinnerTeamIndex = updatedTournament.teams.findIndex((t) => t.id === oldWinnerId);
      if (oldWinnerTeamIndex > -1) {
        updatedTournament.teams[oldWinnerTeamIndex].points -= 3;
      }
    }
    if (newWinnerId) {
      const newWinnerTeamIndex = updatedTournament.teams.findIndex((t) => t.id === newWinnerId);
      if (newWinnerTeamIndex > -1) {
        updatedTournament.teams[newWinnerTeamIndex].points += 3;
        updatedTournament.matches[matchIndex].status = 'completed';
      }
    }
    try {
      const success = saveTournamentData(updatedTournament);
      if (success) {
        setTournament(updatedTournament);
        showAlert('Success', 'Match result updated successfully!');
      } else {
        showAlert('Error', 'Could not update match result. Please try again.');
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      showAlert('Error', 'Could not update match result. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Game History</h3>
        {completedMatches.length === 0 ? (
          <p className="text-gray-300 text-center py-8">No completed matches yet.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {completedMatches.map((match) => {
              const teamAWon = match.winnerId === match.teamA.id;
              const teamBWon = match.winnerId === match.teamB.id;
              return (
                <div key={match.id} className="bg-gray-700 p-4 rounded-lg">
                  <div className="mb-3">
                    <p className={`text-lg ${teamAWon ? 'text-yellow-400 font-bold' : ''}`}>{match.teamA.players.join(' & ')}</p>
                    <p className="text-center text-gray-400 font-bold my-1">VS</p>
                    <p className={`text-lg ${teamBWon ? 'text-yellow-400 font-bold' : ''}`}>{match.teamB.players.join(' & ')}</p>
                  </div>
                  <div className="border-t border-gray-600 pt-3">
                    <label className="block text-sm font-medium mb-2">Change Winner:</label>
                    <select value={match.winnerId || ''} onChange={(e) => handleWinnerChange(match, e.target.value)} className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">No Winner</option>
                      <option value={match.teamA.id}>{match.teamA.players.join(' & ')}</option>
                      <option value={match.teamB.id}>{match.teamB.players.join(' & ')}</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">Close</button>
      </div>
    </div>
  );
}


