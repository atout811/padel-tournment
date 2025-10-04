import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import { CustomAlert } from './components/Alert.jsx';
import PlayerSetupScreen from './screens/PlayerSetupScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';
import { getOrCreateUserId, loadTournamentData } from './utils/storage';
import { buildTournamentShareUrl, createTournamentRecord, fetchTournamentById, subscribeToTournament } from './utils/tournamentService';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });
  const [shareLink, setShareLink] = useState('');
  const subscriptionCleanup = useRef(null);

  const showAlert = (title, message) => setAlert({ show: true, title, message });

  const detachSubscription = useCallback(() => {
    if (subscriptionCleanup.current) {
      subscriptionCleanup.current();
      subscriptionCleanup.current = null;
    }
  }, []);

  const attachSubscription = useCallback(
    (tournamentId) => {
      if (!tournamentId) {
        return;
      }
      detachSubscription();
      subscriptionCleanup.current = subscribeToTournament(tournamentId, (updatedTournament) => {
        if (!updatedTournament) {
          return;
        }
        setTournament((current) => {
          if (!current?.updatedAt) {
            return updatedTournament;
          }
          if (!updatedTournament.updatedAt) {
            return current;
          }
          const incoming = new Date(updatedTournament.updatedAt);
          const existing = new Date(current.updatedAt);
          return incoming >= existing ? updatedTournament : current;
        });
      });
    },
    [detachSubscription]
  );

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tournamentIdFromUrl = params.get('tournamentId');
        getOrCreateUserId();

        if (tournamentIdFromUrl) {
          const remoteTournament = await fetchTournamentById(tournamentIdFromUrl);
          if (!active) {
            return;
          }
          if (remoteTournament) {
            setTournament(remoteTournament);
            setScreen('tournament');
          } else {
            showAlert('Tournament Not Found', 'This tournament link appears to be invalid or has been removed.');
            setScreen('setup');
            window.history.replaceState(null, '', window.location.pathname);
          }
          return;
        }

        const cachedTournament = loadTournamentData();
        if (!active) {
          return;
        }

        if (cachedTournament) {
          let hydratedTournament = cachedTournament;
          if (!cachedTournament.id) {
            try {
              hydratedTournament = await createTournamentRecord(cachedTournament);
            } catch (syncError) {
              console.error('Error migrating local tournament to Supabase:', syncError);
              showAlert('Sync Error', 'Existing local tournament could not be synced to the cloud. Please create a new tournament.');
              hydratedTournament = null;
            }
          }

          if (hydratedTournament) {
            setTournament(hydratedTournament);
            setScreen('tournament');
          } else {
            setScreen('setup');
          }
        } else {
          setScreen('setup');
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        if (!active) {
          return;
        }
        showAlert('Error', 'Could not load tournament data.');
        setScreen('setup');
      }
    };

    initialize();

    return () => {
      active = false;
      detachSubscription();
    };
  }, [detachSubscription]);

  useEffect(() => {
    if (tournament?.id) {
      attachSubscription(tournament.id);
      const nextShareUrl = buildTournamentShareUrl(tournament.id);
      setShareLink(nextShareUrl);
      if (window.location.href !== nextShareUrl) {
        window.history.replaceState(null, '', nextShareUrl);
      }
    } else {
      setShareLink('');
      if (window.location.search.includes('tournamentId')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
      detachSubscription();
    }
  }, [tournament?.id, attachSubscription, detachSubscription]);

  const renderScreen = () => {
    if (screen === 'loading') return <LoadingScreen />;
    if (screen === 'setup' || !tournament)
      return <PlayerSetupScreen showAlert={showAlert} setTournament={setTournament} setScreen={setScreen} />;
    if (screen === 'tournament' && tournament)
      return <TournamentScreen tournament={tournament} setTournament={setTournament} showAlert={showAlert} setScreen={setScreen} shareLink={shareLink} />;
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
