import React, { useEffect, useState } from 'react';
import Header from './components/Header.jsx';
import { CustomAlert } from './components/Alert.jsx';
import PlayerSetupScreen from './screens/PlayerSetupScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';
import { getOrCreateUserId, loadTournamentData } from './utils/storage';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });

  const showAlert = (title, message) => setAlert({ show: true, title, message });

  useEffect(() => {
    try {
      getOrCreateUserId();
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
    if (screen === 'loading') return <LoadingScreen />;
    if (screen === 'setup' || !tournament) return <PlayerSetupScreen showAlert={showAlert} setTournament={setTournament} setScreen={setScreen} />;
    if (screen === 'tournament' && tournament) return <TournamentScreen tournament={tournament} setTournament={setTournament} showAlert={showAlert} setScreen={setScreen} />;
    return <LoadingScreen />;
  };

  return (
    <div className="bg-gray-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 max-w-4xl">
        <Header />
        <main>{renderScreen()}</main>
        {alert.show && (
          <CustomAlert title={alert.title} message={alert.message} onClose={() => setAlert({ show: false, title: '', message: '' })} />
        )}
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex justify-center items-center p-10">
      <p className="text-xl">Loading Tournament...</p>
    </div>
  );
}


