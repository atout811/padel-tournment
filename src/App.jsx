import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import { CustomAlert } from './components/Alert.jsx';
import GroupHomeScreen from './screens/GroupHomeScreen.jsx';
import GroupListScreen from './screens/GroupListScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import PlayerSetupScreen from './screens/PlayerSetupScreen.jsx';
import PlayersPoolScreen from './screens/PlayersPoolScreen.jsx';
import StartGroupNightScreen from './screens/StartGroupNightScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';
import { fetchGroups } from './utils/groupService';
import { getOrCreateUserId } from './utils/storage';
import { buildTournamentShareUrl, fetchTournamentById, subscribeToTournament } from './utils/tournamentService';

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

        if (!active) {
          return;
        }

        setTournament(null);
        setScreen('home');
        window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
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

  const findGroupForTournament = useCallback(
    async (tournamentData) => {
      const groupId = tournamentData?.groupId;
      if (!groupId) return null;
      if (selectedGroup?.id === groupId) return selectedGroup;

      try {
        const groups = await fetchGroups();
        return groups.find((group) => group.id === groupId) || null;
      } catch (error) {
        console.error('Error resolving tournament group:', error);
        return null;
      }
    },
    [selectedGroup]
  );

  const leaveTournamentView = useCallback(
    async (tournamentData = tournament, options = {}) => {
      const group = await findGroupForTournament(tournamentData);
      setTournament(null);

      if (tournamentData?.groupId) {
        navigateToScreen(group ? 'groupHome' : 'groups', { group, replace: options.replace ?? true });
        return;
      }

      navigateToScreen('home', { replace: options.replace ?? true });
    },
    [findGroupForTournament, navigateToScreen, tournament]
  );

  useEffect(() => {
    if (tournament?.id) {
      attachSubscription(tournament.id);
      const nextShareUrl = buildTournamentShareUrl(tournament.id);
      setShareLink(nextShareUrl);
      if (window.location.href !== nextShareUrl) {
        window.history.replaceState({ screen: 'tournament', selectedGroup }, '', nextShareUrl);
      }
    } else {
      setShareLink('');
      if (window.location.search.includes('tournamentId')) {
        window.history.replaceState({ screen, selectedGroup }, '', window.location.pathname);
      }
      detachSubscription();
    }
  }, [tournament?.id, attachSubscription, detachSubscription, screen, selectedGroup]);

  const navigation = useMemo(() => {
    if (screen === 'loading') return null;
    if (tournament) {
      return {
        label: tournament.groupId ? 'Group' : 'Home',
        contextLabel: tournament.format === 'league' ? 'League Night' : 'Cup Night',
        onBack: () => leaveTournamentView(tournament),
      };
    }
    if (screen === 'groups') return { label: 'Home', contextLabel: 'Groups', onBack: () => navigateToScreen('home') };
    if (screen === 'groupHome') return { label: 'Groups', contextLabel: selectedGroup?.name || 'Group', onBack: () => navigateToScreen('groups', { group: null }) };
    if (screen === 'playersPool') return { label: 'Group', contextLabel: 'Players Pool', onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'startGroupNight') return { label: 'Group', contextLabel: 'Start Night', onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'setup') return { label: 'Home', contextLabel: 'Quick Start', onBack: () => navigateToScreen('home') };
    return { contextLabel: 'Match Day' };
  }, [leaveTournamentView, navigateToScreen, screen, selectedGroup, tournament]);

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
      return (
        <TournamentScreen
          tournament={tournament}
          setTournament={setTournament}
          showAlert={showAlert}
          setScreen={navigateToScreen}
          shareLink={shareLink}
          onTournamentEnded={leaveTournamentView}
        />
      );
    return <LoadingScreen />;
  };

  return (
    <div className="min-h-screen bg-[#020D16] text-[#F7F8F7] font-sans">
      <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-6">
        <Header backLabel={navigation?.label} contextLabel={navigation?.contextLabel} onBack={navigation?.onBack} />
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
    <div className="flex items-center justify-center rounded-b-3xl border-x border-b border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 p-10 shadow-xl shadow-[#020D16]/5">
      <p className="text-lg font-black text-[#BEDC45]">Loading tournament...</p>
    </div>
  );
}
