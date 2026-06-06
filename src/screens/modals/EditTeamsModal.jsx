import React, { useState } from 'react';
import { updateTournamentRecord } from '../../utils/tournamentService';

export default function EditTeamsModal({ tournament, setTournament, onClose, showAlert }) {
  const [editableTeams, setEditableTeams] = useState(tournament.teams.map((team) => ({ ...team, players: [...team.players] })));
  const [availablePlayers] = useState(tournament.players);
  const [isSaving, setIsSaving] = useState(false);

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
      setIsSaving(true);
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      onClose();
      showAlert('Success', 'Teams updated successfully!');
    } catch (error) {
      console.error('Error saving team changes:', error);
      showAlert('Error', 'Could not save team changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-6">
        <h3 className="mb-4 text-xl font-bold">Edit Teams</h3>
        <div className="mb-6 space-y-4">
          {editableTeams.map((team, teamIndex) => (
            <div key={team.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <h4 className="mb-2 font-bold">Team {teamIndex + 1}</h4>
              <div className="space-y-2">
                {team.players.map((player, playerIndex) => (
                  <select key={playerIndex} value={player} onChange={(e) => handlePlayerChange(teamIndex, playerIndex, e.target.value)} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-900 p-2 text-white outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/30">
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
        <div className="grid gap-3 sm:grid-cols-2">
          <button onClick={onClose} className="min-h-11 rounded-lg bg-slate-700 py-2 font-bold text-white hover:bg-slate-600">Cancel</button>
          <button onClick={saveTeamChanges} disabled={isSaving} className="min-h-11 rounded-lg bg-emerald-600 py-2 font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60">{isSaving ? 'Saving...' : 'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
}


