import React, { useState } from 'react';
import { saveTournamentData } from '../utils/storage';
import { distributeMatchesFairly, generateLeagueMatches } from '../utils/scheduling';

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup');

  const handleAddPlayer = () => {
    if (playerName.trim() && !players.includes(playerName.trim())) {
      setPlayers([...players, playerName.trim()]);
      setPlayerName('');
    } else {
      showAlert('Invalid Name', 'Player name cannot be empty or a duplicate.');
    }
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers(players.filter((p) => p !== nameToRemove));
  };

  const generateMatches = (teams, format) => {
    const matches = [];
    if (format === 'league') {
      return generateLeagueMatches(teams);
    } else {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({ id: `round1_match_${i}_${j}`, round: 1, teamA: teams[i], teamB: teams[j], winnerId: null, status: 'pending' });
        }
      }
    }
    return distributeMatchesFairly(matches);
  };

  const handleCreateTournament = async () => {
    if (players.length < 4) {
      showAlert('Not Enough Players', 'You need at least 4 players to start a tournament.');
      return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < Math.floor(shuffledPlayers.length / 2) * 2; i += 2) {
      teams.push({ id: `team_${i / 2 + 1}`, players: [shuffledPlayers[i], shuffledPlayers[i + 1]], points: 0 });
    }
    if (shuffledPlayers.length % 2 !== 0) {
      teams.push({ id: `team_${teams.length + 1}`, players: [shuffledPlayers[shuffledPlayers.length - 1], 'random'], points: 0 });
    }

    const matches = generateMatches(teams, tournamentFormat);
    const maxRounds = 2;

    const newTournament = {
      players,
      teams,
      matches,
      substitute: null,
      status: 'active',
      currentRound: 1,
      maxRounds,
      format: tournamentFormat,
      createdAt: new Date().toISOString(),
      currentMatchId: matches.find((m) => m.round === 1 && m.status === 'pending')?.id || null,
    };

    try {
      const success = saveTournamentData(newTournament);
      if (success) {
        setTournament(newTournament);
        setScreen('tournament');
      } else {
        showAlert('Error', 'Could not save the tournament. Please try again.');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      showAlert('Error', 'Could not save the tournament. Please try again.');
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-b-lg">
      <h2 className="text-2xl font-bold mb-4">Add Players</h2>
      <div className="flex gap-2 mb-4">
        <input type="text" className="flex-grow bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter player name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { handleAddPlayer(); } }} />
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors" onClick={handleAddPlayer}>Add</button>
      </div>
      <div className="space-y-2 mb-6">
        {players.length > 0 ? (
          players.map((item, index) => (
            <div key={item} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
              <span className="text-lg">
                <span className="text-blue-400 font-semibold mr-2">#{index + 1}</span>
                {item}
              </span>
              <button onClick={() => handleRemovePlayer(item)}>❌</button>
            </div>
          ))
        ) : (
          <p className="text-gray-400 text-center">No players added yet.</p>
        )}
      </div>
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-3">Tournament Format</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input type="radio" id="cup" name="tournamentFormat" value="cup" checked={tournamentFormat === 'cup'} onChange={(e) => setTournamentFormat(e.target.value)} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
            <label htmlFor="cup" className="ml-3 flex-1">
              <div className="text-lg font-medium">🏆 Cup Format</div>
              <div className="text-gray-400 text-sm">Round-robin + elimination semifinals (current)</div>
            </label>
          </div>
          <div className="flex items-center">
            <input type="radio" id="league" name="tournamentFormat" value="league" checked={tournamentFormat === 'league'} onChange={(e) => setTournamentFormat(e.target.value)} className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500" />
            <label htmlFor="league" className="ml-3 flex-1">
              <div className="text-lg font-medium">🏟️ League Format</div>
              <div className="text-gray-400 text-sm">Every team plays every other team twice</div>
            </label>
          </div>
        </div>
      </div>

      <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" onClick={handleCreateTournament}>Create Tournament</button>
    </div>
  );
}


