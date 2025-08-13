import React, { useState } from 'react';
import { saveTournamentData } from '../../utils/storage';

export default function EditTeamsModal({ tournament, setTournament, onClose, showAlert }) {
  const [editableTeams, setEditableTeams] = useState(tournament.teams.map((team) => ({ ...team, players: [...team.players] })));
  const [availablePlayers] = useState(tournament.players);

  const handlePlayerChange = (teamIndex, playerIndex, newPlayer) => {
    if (!newPlayer) return;
    const newTeams = [...editableTeams];
    const oldPlayer = newTeams[teamIndex].players[playerIndex];
    if (oldPlayer === newPlayer) return;
    let swapTeamIndex = -1;
    let swapPlayerIndex = -1;
    for (let tIndex = 0; tIndex < newTeams.length; tIndex++) {
      if (tIndex !== teamIndex) {
        const pIndex = newTeams[tIndex].players.indexOf(newPlayer);
        if (pIndex !== -1) {
          swapTeamIndex = tIndex;
          swapPlayerIndex = pIndex;
          break;
        }
      }
    }
    if (swapTeamIndex !== -1) {
      newTeams[swapTeamIndex].players[swapPlayerIndex] = oldPlayer;
    }
    newTeams[teamIndex].players[playerIndex] = newPlayer;
    setEditableTeams(newTeams);
  };

  const saveTeamChanges = async () => {
    const allAssignedPlayers = editableTeams.flatMap((team) => team.players);
    const uniquePlayers = new Set(allAssignedPlayers);
    if (uniquePlayers.size !== allAssignedPlayers.length) {
      showAlert('Invalid Teams', 'Each player can only be in one team!');
      return;
    }
    const updatedMatches = tournament.matches.map((match) => {
      const updatedTeamA = editableTeams.find((team) => team.id === match.teamA.id);
      const updatedTeamB = editableTeams.find((team) => team.id === match.teamB.id);
      return { ...match, teamA: updatedTeamA || match.teamA, teamB: updatedTeamB || match.teamB };
    });
    const updatedTournament = { ...tournament, teams: editableTeams, matches: updatedMatches };
    try {
      const success = saveTournamentData(updatedTournament);
      if (success) {
        setTournament(updatedTournament);
        onClose();
        showAlert('Success', 'Teams updated successfully!');
      } else {
        showAlert('Error', 'Could not save team changes. Please try again.');
      }
    } catch (error) {
      console.error('Error saving team changes:', error);
      showAlert('Error', 'Could not save team changes. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Edit Teams</h3>
        <div className="space-y-4 mb-6">
          {editableTeams.map((team, teamIndex) => (
            <div key={team.id} className="bg-gray-700 p-4 rounded-lg">
              <h4 className="font-bold mb-2">Team {teamIndex + 1}</h4>
              <div className="space-y-2">
                {team.players.map((player, playerIndex) => (
                  <select key={playerIndex} value={player} onChange={(e) => handlePlayerChange(teamIndex, playerIndex, e.target.value)} className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {availablePlayers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                        {editableTeams.some((t, tIndex) => tIndex !== teamIndex && t.players.includes(p)) ? ' (will swap)' : ''}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-4">
          <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">Cancel</button>
          <button onClick={saveTeamChanges} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">Save Changes</button>
        </div>
      </div>
    </div>
  );
}


