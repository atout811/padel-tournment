import React, { useCallback, useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import { CustomAlert } from './components/Alert.jsx';
import GroupHomeScreen from './screens/GroupHomeScreen.jsx';
import GroupListScreen from './screens/GroupListScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import PlayerSetupScreen from './screens/PlayerSetupScreen.jsx';
import PlayersPoolScreen from './screens/PlayersPoolScreen.jsx';
import StartGroupNightScreen from './screens/StartGroupNightScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';
import { getOrCreateUserId, loadTournamentData } from './utils/storage';
import { buildTournamentShareUrl, createTournamentRecord, fetchTournamentById, subscribeToTournament } from './utils/tournamentService';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });
  const [shareLink, setShareLink] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const subscriptionCleanup = useRef(null);
  const historyReady = useRef(false);

  const showAlert = useCallback((title, message) => setAlert({ show: true, title, message }), []);

  const navigateToScreen = useCallback((nextScreen, options = {}) => {
    const { group, replace = false } = options;
    if (group !== undefined) {
      setSelectedGroup(group);
    }
    setScreen(nextScreen);

    if (!historyReady.current) {
      return;
    }

    const state = {
      screen: nextScreen,
      selectedGroup: group !== undefined ? group : selectedGroup,
    };
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](state, '', window.location.href);
  }, [selectedGroup]);

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
            window.history.replaceState({ screen: 'tournament', selectedGroup: null }, '', window.location.href);
          } else {
            showAlert('Tournament Not Found', 'This tournament link appears to be invalid or has been removed.');
            setScreen('home');
            window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.pathname);
          }
          historyReady.current = true;
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
            window.history.replaceState({ screen: 'tournament', selectedGroup: null }, '', window.location.href);
          } else {
            setScreen('home');
            window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
          }
        } else {
          setScreen('home');
          window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        if (!active) {
          return;
        }
        showAlert('Error', 'Could not load tournament data.');
        setScreen('home');
        window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
      }
      historyReady.current = true;
    };

    initialize();

    return () => {
      active = false;
      detachSubscription();
    };
  }, [detachSubscription, showAlert]);

  useEffect(() => {
    const handlePopState = (event) => {
      const nextScreen = event.state?.screen;
      if (!nextScreen) {
        return;
      }
      setSelectedGroup(event.state.selectedGroup || null);
      setScreen(nextScreen);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (tournament?.id) {
      attachSubscription(tournament.id);
      const nextShareUrl = buildTournamentShareUrl(tournament.id);
      setShareLink(nextShareUrl);
      if (window.location.href !== nextShareUrl) {
        window.history.replaceState({ screen: 'tournament', selectedGroup: null }, '', nextShareUrl);
      }
    } else {
      setShareLink('');
      if (window.location.search.includes('tournamentId')) {
        window.history.replaceState({ screen, selectedGroup }, '', window.location.pathname);
      }
      detachSubscription();
    }
  }, [tournament?.id, attachSubscription, detachSubscription, screen, selectedGroup]);

  const renderScreen = () => {
    if (screen === 'loading') return <LoadingScreen />;
    if (screen === 'home' && !tournament) return <HomeScreen setScreen={navigateToScreen} />;
    if (screen === 'groups' && !tournament) return <GroupListScreen showAlert={showAlert} setScreen={navigateToScreen} setSelectedGroup={setSelectedGroup} />;
    if (screen === 'groupHome' && !tournament)
      return <GroupHomeScreen group={selectedGroup} showAlert={showAlert} setScreen={navigateToScreen} />;
    if (screen === 'playersPool' && !tournament)
      return <PlayersPoolScreen group={selectedGroup} showAlert={showAlert} setScreen={navigateToScreen} />;
    if (screen === 'startGroupNight' && !tournament)
      return (
        <StartGroupNightScreen
          group={selectedGroup}
          showAlert={showAlert}
          setTournament={setTournament}
          setScreen={navigateToScreen}
        />
      );
    if (screen === 'setup' || !tournament)
      return <PlayerSetupScreen showAlert={showAlert} setTournament={setTournament} setScreen={navigateToScreen} />;
    if (tournament)
      return <TournamentScreen tournament={tournament} setTournament={setTournament} showAlert={showAlert} setScreen={navigateToScreen} shareLink={shareLink} />;
    return <LoadingScreen />;
  };

  return (
    <div className="min-h-screen bg-[#F6F8F4] text-[#18211C] font-sans">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-6">
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
    <div className="flex items-center justify-center rounded-b-3xl border-x border-b border-[#DDE7DE] bg-white/90 p-10 shadow-xl shadow-[#163B2E]/5">
      <p className="text-lg font-black text-[#146C52]">Loading tournament...</p>
    </div>
  );
}
