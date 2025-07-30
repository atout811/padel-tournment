import React, { useState, useEffect, useMemo } from 'react';

// --- Local Storage Keys ---
const STORAGE_KEY = 'padel-tournament-data';
const USER_ID_KEY = 'padel-tournament-user-id';

// --- Local User Management ---
const getOrCreateUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

// --- Local Storage Data Management ---
const loadTournamentData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading tournament data:', error);
    return null;
  }
};

const saveTournamentData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving tournament data:', error);
    return false;
  }
};

const deleteTournamentData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting tournament data:', error);
    return false;
  }
};

// --- Main App Component ---
export default function App() {
  const [tournament, setTournament] = useState(null);
  const [screen, setScreen] = useState('loading'); // loading, setup, tournament
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });

  // --- Custom Alert Handler ---
  const showAlert = (title, message) => {
    setAlert({ show: true, title, message });
  };

  // --- Initialize User and Load Data Effect ---
  useEffect(() => {
    try {
      // Ensure user ID exists for future use
      getOrCreateUserId();

      // Load tournament data
      const tournamentData = loadTournamentData();
      if (tournamentData) {
        setTournament(tournamentData);
        setScreen('tournament');
      } else {
        setTournament(null);
        setScreen('setup');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      showAlert('Error', 'Could not load tournament data.');
      setScreen('setup');
    }
  }, []);

  const renderScreen = () => {
    if (screen === 'loading') {
      return <LoadingScreen />;
    }
    if (screen === 'setup' || !tournament) {
      return <PlayerSetupScreen showAlert={showAlert} setTournament={setTournament} setScreen={setScreen} />;
    }
    if (screen === 'tournament' && tournament) {
      return <TournamentScreen tournament={tournament} setTournament={setTournament} showAlert={showAlert} setScreen={setScreen} />;
    }
    return <LoadingScreen />;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 max-w-4xl">
        <Header />
        <main>
            {renderScreen()}
        </main>
        {alert.show && <CustomAlert title={alert.title} message={alert.message} onClose={() => setAlert({ show: false, title: '', message: '' })} />}
      </div>
    </div>
  );
}

// --- Screens and Components ---

const Header = () => (
  <header className="p-6 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-t-lg border-b-2 border-blue-500 text-center shadow-lg">
    <div className="flex items-center justify-center space-x-3 mb-2">
      <span className="text-3xl">🎾</span>
      <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
        Padel Tournament Pro
      </h1>
      <span className="text-3xl">🎾</span>
    </div>
    <p className="text-blue-200 text-sm md:text-base font-medium">
      🏆 Organize • Compete • Champion 🏆
    </p>
  </header>
);

const LoadingScreen = () => (
  <div className="flex justify-center items-center p-10">
    <p className="text-xl">Loading Tournament...</p>
  </div>
);

const PlayerSetupScreen = ({ showAlert, setTournament, setScreen }) => {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup'); // 'cup' or 'league'

  const handleAddPlayer = () => {
    if (playerName.trim() && !players.includes(playerName.trim())) {
      setPlayers([...players, playerName.trim()]);
      setPlayerName('');
    } else {
      showAlert("Invalid Name", "Player name cannot be empty or a duplicate.");
    }
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers(players.filter(p => p !== nameToRemove));
  };

  const generateMatches = (teams, format) => {
    const matches = [];
    let matchId = 0;
    
    if (format === 'league') {
      // League format: Every team plays every other team twice
      for (let round = 1; round <= 2; round++) {
        for (let i = 0; i < teams.length; i++) {
          for (let j = i + 1; j < teams.length; j++) {
            matches.push({
              id: `round${round}_match_${matchId++}`,
              round: round,
              teamA: teams[i],
              teamB: teams[j],
              winnerId: null,
              status: 'pending',
            });
          }
        }
      }
    } else {
      // Cup format: Round-robin then elimination
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matches.push({
            id: `round1_match_${i}_${j}`,
            round: 1,
            teamA: teams[i],
            teamB: teams[j],
            winnerId: null,
            status: 'pending',
          });
        }
      }
    }
    
    return matches;
  };

  const handleCreateTournament = async () => {
    if (players.length < 4) {
      showAlert("Not Enough Players", "You need at least 4 players to start a tournament.");
      return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const teams = [];
    for (let i = 0; i < Math.floor(shuffledPlayers.length / 2) * 2; i += 2) {
        teams.push({
            id: `team_${i/2 + 1}`,
            players: [shuffledPlayers[i], shuffledPlayers[i+1]],
            points: 0,
        });
    }
    
    // If there's an odd number of players, add the remaining player with "random"
    if (shuffledPlayers.length % 2 !== 0) {
        teams.push({
            id: `team_${teams.length + 1}`,
            players: [shuffledPlayers[shuffledPlayers.length - 1], "random"],
            points: 0,
        });
    }
    
    const substitute = null; // No longer needed since substitute is now a team

    // Create matches using simple generation
    const matches = generateMatches(teams, tournamentFormat);
    const maxRounds = 2;

    const newTournament = { 
        players, 
        teams, 
        matches,
        substitute, 
        status: 'active', 
        currentRound: 1,
        maxRounds,
        format: tournamentFormat, // Store the tournament format
        createdAt: new Date().toISOString() 
    };

    try {
      const success = saveTournamentData(newTournament);
      if (success) {
        setTournament(newTournament);
        setScreen('tournament');
      } else {
        showAlert("Error", "Could not save the tournament. Please try again.");
      }
    } catch (error) {
      console.error("Error creating tournament:", error);
      showAlert("Error", "Could not save the tournament. Please try again.");
    }
  };

  return (
    <div className="bg-gray-800 p-6 rounded-b-lg">
      <h2 className="text-2xl font-bold mb-4">Add Players</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="flex-grow bg-gray-700 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Enter player name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddPlayer();
            }
          }}
        />
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors" onClick={handleAddPlayer}>
          Add
        </button>
      </div>
      <div className="space-y-2 mb-6">
        {players.length > 0 ? players.map((item, index) => (
          <div key={item} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
            <span className="text-lg">
              <span className="text-blue-400 font-semibold mr-2">#{index + 1}</span>
              {item}
            </span>
            <button onClick={() => handleRemovePlayer(item)}>❌</button>
          </div>
        )) : <p className="text-gray-400 text-center">No players added yet.</p>}
      </div>
      
      {/* Tournament Format Selection */}
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-3">Tournament Format</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="radio"
              id="cup"
              name="tournamentFormat"
              value="cup"
              checked={tournamentFormat === 'cup'}
              onChange={(e) => setTournamentFormat(e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <label htmlFor="cup" className="ml-3 flex-1">
              <div className="text-lg font-medium">🏆 Cup Format</div>
              <div className="text-gray-400 text-sm">Round-robin + elimination semifinals (current)</div>
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="radio"
              id="league"
              name="tournamentFormat"
              value="league"
              checked={tournamentFormat === 'league'}
              onChange={(e) => setTournamentFormat(e.target.value)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <label htmlFor="league" className="ml-3 flex-1">
              <div className="text-lg font-medium">🏟️ League Format</div>
              <div className="text-gray-400 text-sm">Every team plays every other team twice</div>
            </label>
          </div>
        </div>
      </div>

      <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors" onClick={handleCreateTournament}>
        Create Tournament
      </button>
    </div>
  );
};

const TournamentScreen = ({ tournament, setTournament, showAlert, setScreen }) => {
    const [showEndConfirm, setShowEndConfirm] = useState(false);
    const [showEditTeams, setShowEditTeams] = useState(false);
    const [showGameHistory, setShowGameHistory] = useState(false);

    const handleDeclareWinner = async (match, winnerId) => {
        const updatedTournament = JSON.parse(JSON.stringify(tournament));

        const matchIndex = updatedTournament.matches.findIndex(m => m.id === match.id);
        if (matchIndex > -1) {
            updatedTournament.matches[matchIndex].winnerId = winnerId;
            updatedTournament.matches[matchIndex].status = 'completed';
        }

        const teamIndex = updatedTournament.teams.findIndex(t => t.id === winnerId);
        if (teamIndex > -1) {
            updatedTournament.teams[teamIndex].points += 3;
        }

        // Check if we need to advance to Round 2
        const currentRoundMatches = updatedTournament.matches.filter(m => m.round === updatedTournament.currentRound);
        const completedCurrentRound = currentRoundMatches.filter(m => m.status === 'completed');
        
        // Debug logging
        console.log('=== ROUND ADVANCEMENT DEBUG ===');
        console.log('Current Round:', updatedTournament.currentRound);
        console.log('Total Round 1 matches:', currentRoundMatches.length);
        console.log('Completed Round 1 matches:', completedCurrentRound.length);
        console.log('Condition check:', completedCurrentRound.length === currentRoundMatches.length && updatedTournament.currentRound === 1);
        console.log('=== END DEBUG ===');
        
        if (completedCurrentRound.length === currentRoundMatches.length && updatedTournament.currentRound === 1) {
            if (updatedTournament.format === 'league') {
                // League format: Simply advance to round 2 (second round-robin)
                console.log('🚀 TRIGGERING LEAGUE ROUND 2 ADVANCEMENT!');
                setTimeout(() => advanceToLeagueRound2(updatedTournament), 1000);
            } else {
                // Cup format: Round 1 is completed, prepare for Round 2 (semifinals)
                console.log('🚀 TRIGGERING CUP ROUND 2 ADVANCEMENT!');
                setTimeout(() => advanceToRound2(updatedTournament), 1000);
            }
        }

        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                setTournament(updatedTournament);
            } else {
                showAlert("Error", "Could not save the score. Please try again.");
            }
        } catch (error) {
            console.error("Error saving score:", error);
            showAlert("Error", "Could not save the score. Please try again.");
        }
    };

    const advanceToRound2 = async (tournamentData) => {
        console.log('🚀 ADVANCE TO ROUND 2 CALLED!');
        const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
        
        // Get top 4 teams by points
        const sortedTeams = [...updatedTournament.teams].sort((a, b) => b.points - a.points);
        console.log('Sorted teams by points:', sortedTeams.map(t => `${t.players.join(' & ')}: ${t.points}pts`));
        
        const top4Teams = sortedTeams.slice(0, 4);
        console.log('Top 4 teams advancing:', top4Teams.map(t => t.players.join(' & ')));
        
        if (top4Teams.length < 4) {
            console.log('❌ Not enough teams for Round 2. Only have:', top4Teams.length);
            showAlert("Error", "Not enough teams for Round 2. Need at least 4 teams.");
            return;
        }

        // Create Round 2 matches (semifinals)
        const semifinal1 = {
            id: 'round2_semifinal_1',
            round: 2,
            matchType: 'semifinal',
            teamA: top4Teams[0], // 1st vs 4th
            teamB: top4Teams[3],
            winnerId: null,
            status: 'pending',
        };

        const semifinal2 = {
            id: 'round2_semifinal_2',
            round: 2,
            matchType: 'semifinal',
            teamA: top4Teams[1], // 2nd vs 3rd
            teamB: top4Teams[2],
            winnerId: null,
            status: 'pending',
        };

        // Add semifinal matches to the tournament
        updatedTournament.matches.push(semifinal1, semifinal2);
        updatedTournament.currentRound = 2;

        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                console.log('✅ Successfully advanced to Round 2!');
                setTournament(updatedTournament);
                showAlert("Round 2!", "Top 4 teams advance to semifinals!");
            } else {
                console.log('❌ Failed to save Round 2 data');
                showAlert("Error", "Could not advance to Round 2. Please try again.");
            }
        } catch (error) {
            console.error("Error advancing to Round 2:", error);
            showAlert("Error", "Could not advance to Round 2. Please try again.");
        }
    };

    const advanceToLeagueRound2 = async (tournamentData) => {
        console.log('🚀 ADVANCE TO LEAGUE ROUND 2 CALLED!');
        const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
        
        // In league format, all Round 2 matches should already exist
        // We just need to update the current round
        updatedTournament.currentRound = 2;
        
        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                console.log('✅ Successfully advanced to League Round 2!');
                setTournament(updatedTournament);
                showAlert("Round 2!", "Starting second round of league play!");
            } else {
                console.log('❌ Failed to save League Round 2 data');
                showAlert("Error", "Could not advance to Round 2. Please try again.");
            }
        } catch (error) {
            console.error("Error advancing to League Round 2:", error);
            showAlert("Error", "Could not advance to Round 2. Please try again.");
        }
    };

    const createFinals = async (tournamentData) => {
        const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
        
        // Get winners of semifinals
        const semifinalMatches = updatedTournament.matches.filter(m => 
            m.round === 2 && m.matchType === 'semifinal' && m.status === 'completed'
        );
        
        if (semifinalMatches.length !== 2) return;
        
        const semifinal1Winner = updatedTournament.teams.find(t => t.id === semifinalMatches[0].winnerId);
        const semifinal2Winner = updatedTournament.teams.find(t => t.id === semifinalMatches[1].winnerId);
        
        if (!semifinal1Winner || !semifinal2Winner) return;

        // Create finals match
        const finals = {
            id: 'round2_finals',
            round: 2,
            matchType: 'final',
            teamA: semifinal1Winner,
            teamB: semifinal2Winner,
            winnerId: null,
            status: 'pending',
        };

        // Add finals match
        updatedTournament.matches.push(finals);

        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                setTournament(updatedTournament);
                showAlert("Finals!", "Championship match is ready!");
            } else {
                showAlert("Error", "Could not create finals. Please try again.");
            }
        } catch (error) {
            console.error("Error creating finals:", error);
            showAlert("Error", "Could not create finals. Please try again.");
        }
    };

    // Check if we need to create finals after a semifinal is completed
    useEffect(() => {
        if (tournament.currentRound === 2) {
            const semifinalMatches = tournament.matches.filter(m => 
                m.round === 2 && m.matchType === 'semifinal'
            );
            const completedSemifinals = semifinalMatches.filter(m => m.status === 'completed');
            const finalsExists = tournament.matches.some(m => m.matchType === 'final');
            
            if (completedSemifinals.length === 2 && !finalsExists) {
                setTimeout(() => createFinals(tournament), 1000);
            }
        }
    }, [tournament]);

    const confirmEndTournament = async () => {
        setShowEndConfirm(false);
        try {
            const success = deleteTournamentData();
            if (success) {
                setTournament(null);
                setScreen('setup');
            } else {
                showAlert("Error", "Could not delete tournament.");
            }
        } catch (error) {
            console.error("Error deleting tournament:", error);
            showAlert("Error", "Could not delete tournament.");
        }
    };

    const leaderboard = useMemo(() => {
        if (!tournament || !tournament.teams) return [];
        return [...tournament.teams].sort((a, b) => b.points - a.points);
    }, [tournament]);
    
    const currentRoundMatches = useMemo(() => 
        tournament.matches.filter(m => m.round === tournament.currentRound), 
        [tournament.matches, tournament.currentRound]
    );
    
    const pendingMatches = useMemo(() => 
        currentRoundMatches.filter(m => m.status === 'pending'), 
        [currentRoundMatches]
    );
    
    const completedMatches = useMemo(() => 
        tournament.matches.filter(m => m.status === 'completed'), 
        [tournament.matches]
    );
    
    const currentMatch = pendingMatches[0];
    // Shuffle upcoming matches for randomness - brilliant suggestion!
    const upcomingMatches = useMemo(() => 
        [...pendingMatches.slice(1)].sort(() => Math.random() - 0.5), 
        [pendingMatches]
    );

    // Check if tournament is completely finished
    const isTournamentFinished = tournament.format === 'league' ?
        (tournament.currentRound === 2 && 
         tournament.matches.filter(m => m.round === 2).every(m => m.status === 'completed')) :
        (tournament.currentRound === 2 && 
         tournament.matches.some(m => m.matchType === 'final' && m.status === 'completed'));

    const getRoundTitle = () => {
        if (tournament.format === 'league') {
            // League format
            if (tournament.currentRound === 1) {
                return "Round 1 - First League Round";
            } else if (tournament.currentRound === 2) {
                return "Round 2 - Second League Round";
            }
            return `Round ${tournament.currentRound} - League`;
        } else {
            // Cup format
            if (tournament.currentRound === 1) {
                return "Round 1 - Group Stage";
            } else if (tournament.currentRound === 2) {
                const finalsExists = tournament.matches.some(m => m.matchType === 'final');
                if (finalsExists) {
                    return "Round 2 - Finals";
                } else {
                    return "Round 2 - Semifinals";
                }
            }
            return `Round ${tournament.currentRound}`;
        }
    };

  return (
    <div className="bg-gray-800 p-6 rounded-b-lg space-y-6">
        {/* Round Info */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-lg text-center">
            <h2 className="text-2xl font-bold text-white">{getRoundTitle()}</h2>
            {tournament.format === 'league' ? (
                <>
                    {tournament.currentRound === 1 && (
                        <p className="text-blue-100 mt-1">Every team plays every other team once</p>
                    )}
                    {tournament.currentRound === 2 && (
                        <p className="text-blue-100 mt-1">Every team plays every other team again</p>
                    )}
                </>
            ) : (
                <>
                    {tournament.currentRound === 1 && (
                        <p className="text-blue-100 mt-1">All teams compete - Top 4 advance to Round 2</p>
                    )}
                    {tournament.currentRound === 2 && (
                        <p className="text-blue-100 mt-1">Championship Round</p>
                    )}
                </>
            )}
        </div>

        {/* Leaderboard */}
        <div className="bg-gray-900 p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-3">Leaderboard</h2>
            <div className="space-y-2">
                {leaderboard.map((team, index) => {
                    const isTop4 = index < 4 && tournament.currentRound === 1;
                    const isChampion = index === 0 && isTournamentFinished;
                    return (
                        <div key={team.id} className={`flex items-center text-lg p-2 rounded ${
                            isChampion ? 'bg-yellow-600 text-black' : 
                            isTop4 ? 'bg-green-700' : 'bg-gray-800'
                        }`}>
                            <span className="font-bold text-gray-400 w-8">
                                {isChampion ? '🏆' : `${index + 1}.`}
                            </span>
                            <span className="flex-grow">{team.players.join(' & ')}</span>
                            <span className="font-bold text-green-400">{team.points} Points</span>
                            {isTop4 && tournament.currentRound === 1 && (
                                <span className="ml-2 text-green-300 text-sm">✓ Qualified</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Current Match */}
        {currentMatch ? (
            <div className="bg-gray-900 p-4 rounded-lg border-2 border-blue-500">
                <h2 className="text-xl font-bold mb-3 text-center">
                    🔥 {currentMatch.matchType === 'final' ? 'CHAMPIONSHIP FINAL' : 
                        currentMatch.matchType === 'semifinal' ? 'SEMIFINAL' : 'Current Match'} 🔥
                </h2>
                <CurrentMatchCard match={currentMatch} onDeclareWinner={handleDeclareWinner} />
            </div>
        ) : (
            <div className="bg-gray-900 p-4 rounded-lg text-center">
                {isTournamentFinished ? (
                    <div>
                        <h2 className="text-2xl font-bold text-yellow-400">🎉 TOURNAMENT CHAMPION! 🎉</h2>
                        <p className="text-xl text-green-400 mt-2">{leaderboard[0]?.players.join(' & ')}</p>
                    </div>
                ) : tournament.currentRound === 1 ? (
                    <h2 className="text-2xl font-bold text-blue-400">🚀 Advancing to Round 2! 🚀</h2>
                ) : (
                    <h2 className="text-2xl font-bold text-green-400">🎯 Preparing Next Match! 🎯</h2>
                )}
            </div>
        )}

        {/* Upcoming Matches */}
        {upcomingMatches.length > 0 && (
            <div className="bg-gray-900 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-3">Upcoming Matches</h2>
                <div className="space-y-3">
                    {upcomingMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            </div>
        )}

        {/* Completed Matches */}
        {completedMatches.length > 0 && (
            <div className="bg-gray-900 p-4 rounded-lg">
                <h2 className="text-xl font-bold mb-3">Completed Matches</h2>
                <div className="space-y-3">
                    {completedMatches.map(match => (
                        <MatchCard key={match.id} match={match} />
                    ))}
                </div>
            </div>
        )}


        <div className="flex gap-4 mt-4">
            <button onClick={() => setShowEditTeams(true)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors">
                Edit Teams
            </button>
            <button onClick={() => setShowGameHistory(true)} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors">
                Game History
            </button>
        </div>
        
        <button onClick={() => setShowEndConfirm(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors mt-4">
            End Tournament
        </button>

        {showEndConfirm && (
            <ConfirmationModal
                title="End Tournament?"
                message="Are you sure you want to end and delete this tournament? This action cannot be undone."
                onConfirm={confirmEndTournament}
                onCancel={() => setShowEndConfirm(false)}
            />
        )}

        {showEditTeams && (
            <EditTeamsModal
                tournament={tournament}
                setTournament={setTournament}
                onClose={() => setShowEditTeams(false)}
                showAlert={showAlert}
            />
        )}

        {showGameHistory && (
            <GameHistoryModal
                tournament={tournament}
                setTournament={setTournament}
                onClose={() => setShowGameHistory(false)}
                showAlert={showAlert}
            />
        )}
    </div>
  );
};

const CurrentMatchCard = ({ match, onDeclareWinner }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg text-center space-y-4">
            <div>
                <p className="text-xl font-semibold">{match.teamA.players.join(' & ')}</p>
                <p className="text-gray-400 my-1 font-bold">VS</p>
                <p className="text-xl font-semibold">{match.teamB.players.join(' & ')}</p>
            </div>
            <div className="flex gap-4 justify-center">
                <button 
                    onClick={() => onDeclareWinner(match, match.teamA.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex-1"
                >
                    Winner: {match.teamA.players[0]} & {match.teamA.players[1]}
                </button>
                <button
                    onClick={() => onDeclareWinner(match, match.teamB.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex-1"
                >
                    Winner: {match.teamB.players[0]} & {match.teamB.players[1]}
                </button>
            </div>
        </div>
    );
};

const MatchCard = ({ match }) => {
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
        <div className={`w-full text-left p-4 rounded-lg ${isCompleted ? 'bg-gray-700 opacity-60' : 'bg-gray-800'}`}>
            <div className="flex justify-between items-center mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${getMatchTypeColor()} text-white`}>
                    {getMatchTypeLabel()}
                </span>
                {isCompleted && (
                    <span className="text-xs text-green-400 font-bold">✓ COMPLETED</span>
                )}
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
};

const CustomAlert = ({ title, message, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-300 mb-4">{message}</p>
            <button onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-8 rounded-lg">OK</button>
        </div>
    </div>
);

const ConfirmationModal = ({ title, message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-sm text-center">
            <h3 className="text-xl font-bold mb-2">{title}</h3>
            <p className="text-gray-300 mb-4">{message}</p>
            <div className="flex gap-4">
                <button onClick={onCancel} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">Cancel</button>
                <button onClick={onConfirm} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded-lg">Confirm</button>
            </div>
        </div>
    </div>
);

const EditTeamsModal = ({ tournament, setTournament, onClose, showAlert }) => {
    const [editableTeams, setEditableTeams] = useState(tournament.teams.map(team => ({
        ...team,
        players: [...team.players]
    })));
    const [availablePlayers] = useState(tournament.players);

    const handlePlayerChange = (teamIndex, playerIndex, newPlayer) => {
        if (!newPlayer) return;
        
        const newTeams = [...editableTeams];
        const oldPlayer = newTeams[teamIndex].players[playerIndex];
        
        // If selecting the same player, do nothing
        if (oldPlayer === newPlayer) return;
        
        // Find if the new player is already in another team
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
        
        // If the new player is in another team, swap them
        if (swapTeamIndex !== -1) {
            newTeams[swapTeamIndex].players[swapPlayerIndex] = oldPlayer;
        }
        
        // Set the new player in the current position
        newTeams[teamIndex].players[playerIndex] = newPlayer;
        setEditableTeams(newTeams);
    };

    const saveTeamChanges = async () => {
        // Validate that all players are assigned and no duplicates
        const allAssignedPlayers = editableTeams.flatMap(team => team.players);
        const uniquePlayers = new Set(allAssignedPlayers);
        
        if (uniquePlayers.size !== allAssignedPlayers.length) {
            showAlert("Invalid Teams", "Each player can only be in one team!");
            return;
        }

        const updatedTournament = {
            ...tournament,
            teams: editableTeams
        };

        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                setTournament(updatedTournament);
                onClose();
                showAlert("Success", "Teams updated successfully!");
            } else {
                showAlert("Error", "Could not save team changes. Please try again.");
            }
        } catch (error) {
            console.error("Error saving team changes:", error);
            showAlert("Error", "Could not save team changes. Please try again.");
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
                                    <select
                                        key={playerIndex}
                                        value={player}
                                        onChange={(e) => handlePlayerChange(teamIndex, playerIndex, e.target.value)}
                                        className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {availablePlayers.map(p => (
                                            <option key={p} value={p}>
                                                {p}
                                                {editableTeams.some((t, tIndex) => 
                                                    tIndex !== teamIndex && t.players.includes(p)
                                                ) ? ' (will swap)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-4">
                    <button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">
                        Cancel
                    </button>
                    <button onClick={saveTeamChanges} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg">
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

const GameHistoryModal = ({ tournament, setTournament, onClose, showAlert }) => {
    const completedMatches = tournament.matches.filter(m => m.status === 'completed');

    const handleWinnerChange = async (match, newWinnerId) => {
        const updatedTournament = JSON.parse(JSON.stringify(tournament));
        
        // Find the match to update
        const matchIndex = updatedTournament.matches.findIndex(m => m.id === match.id);
        if (matchIndex === -1) return;

        const oldWinnerId = updatedTournament.matches[matchIndex].winnerId;
        
        // Update match winner
        updatedTournament.matches[matchIndex].winnerId = newWinnerId;

        // Update team points - remove points from old winner, add to new winner
        if (oldWinnerId) {
            const oldWinnerTeamIndex = updatedTournament.teams.findIndex(t => t.id === oldWinnerId);
            if (oldWinnerTeamIndex > -1) {
                updatedTournament.teams[oldWinnerTeamIndex].points -= 3;
            }
        }

        if (newWinnerId) {
            const newWinnerTeamIndex = updatedTournament.teams.findIndex(t => t.id === newWinnerId);
            if (newWinnerTeamIndex > -1) {
                updatedTournament.teams[newWinnerTeamIndex].points += 3;
            }
        }

        try {
            const success = saveTournamentData(updatedTournament);
            if (success) {
                setTournament(updatedTournament);
                showAlert("Success", "Match result updated successfully!");
            } else {
                showAlert("Error", "Could not update match result. Please try again.");
            }
        } catch (error) {
            console.error("Error updating match result:", error);
            showAlert("Error", "Could not update match result. Please try again.");
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
                                        <p className={`text-lg ${teamAWon ? 'text-yellow-400 font-bold' : ''}`}>
                                            {match.teamA.players.join(' & ')}
                                        </p>
                                        <p className="text-center text-gray-400 font-bold my-1">VS</p>
                                        <p className={`text-lg ${teamBWon ? 'text-yellow-400 font-bold' : ''}`}>
                                            {match.teamB.players.join(' & ')}
                                        </p>
                                    </div>
                                    
                                    <div className="border-t border-gray-600 pt-3">
                                        <label className="block text-sm font-medium mb-2">Change Winner:</label>
                                        <select
                                            value={match.winnerId || ''}
                                            onChange={(e) => handleWinnerChange(match, e.target.value)}
                                            className="w-full bg-gray-600 text-white p-2 rounded border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">No Winner</option>
                                            <option value={match.teamA.id}>
                                                {match.teamA.players.join(' & ')}
                                            </option>
                                            <option value={match.teamB.id}>
                                                {match.teamB.players.join(' & ')}
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <button onClick={onClose} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 rounded-lg">
                    Close
                </button>
            </div>
        </div>
    );
};
