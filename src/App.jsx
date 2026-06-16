import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { CustomAlert } from './components/Alert.jsx';
import AuthScreen from './screens/AuthScreen.jsx';
import GroupHomeScreen from './screens/GroupHomeScreen.jsx';
import GroupListScreen from './screens/GroupListScreen.jsx';
import HomeScreen from './screens/HomeScreen.jsx';
import PlayerSetupScreen from './screens/PlayerSetupScreen.jsx';
import PlayersPoolScreen from './screens/PlayersPoolScreen.jsx';
import StartGroupNightScreen from './screens/StartGroupNightScreen.jsx';
import TournamentHistoryScreen from './screens/TournamentHistoryScreen.jsx';
import TournamentResultScreen from './screens/TournamentResultScreen.jsx';
import TournamentScreen from './screens/TournamentScreen.jsx';
import { HomeIcon, ListIcon, TrophyIcon, UsersIcon } from './components/Icons.jsx';
import { claimLegacyOwnerData, getAuthSession, isAuthAvailable, onAuthStateChanged, signOut } from './utils/authService';
import { fetchGroups } from './utils/groupService';
import { getOrCreateUserId, loadActiveTournamentId, loadTournamentData, saveActiveTournamentId } from './utils/storage';
import { buildTournamentShareUrl, fetchTournamentById, subscribeToTournament } from './utils/tournamentService';

export default function App() {
  const [tournament, setTournament] = useState(null);
  const [resultTournament, setResultTournament] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });
  const [shareLink, setShareLink] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isAuthAvailable());
  const subscriptionCleanup = useRef(null);
  const historyReady = useRef(false);
  const claimedOwnerRef = useRef(null);

  const showAlert = useCallback((title, message) => setAlert({ show: true, title, message }), []);

  const prepareAuthSession = useCallback(
    async (session) => {
      const authUserId = session?.user?.id;
      if (!authUserId || claimedOwnerRef.current === authUserId) {
        return session;
      }

      claimedOwnerRef.current = authUserId;
      try {
        await claimLegacyOwnerData(authUserId);
      } catch (error) {
        console.error('Error claiming local owner data:', error);
        showAlert('Data Migration Failed', 'You are signed in, but old local data could not be attached to your account.');
      }

      return session;
    },
    [showAlert]
  );

  useEffect(() => {
    if (!isAuthAvailable()) {
      setIsAuthLoading(false);
      return () => {};
    }

    let active = true;
    getAuthSession()
      .then((session) => prepareAuthSession(session))
      .then((session) => {
        if (active) setAuthSession(session);
      })
      .catch((error) => {
        console.error('Error loading auth session:', error);
        showAlert('Login Error', 'Could not load your login session.');
      })
      .finally(() => {
        if (active) setIsAuthLoading(false);
      });

    const unsubscribe = onAuthStateChanged((session) => {
      if (!session) {
        setAuthSession(null);
        if (!new URLSearchParams(window.location.search).get('tournamentId')) {
          setTournament(null);
          setResultTournament(null);
          setSelectedGroup(null);
          setScreen('auth');
        }
        setIsAuthLoading(false);
        return;
      }

      setIsAuthLoading(true);
      prepareAuthSession(session)
        .then((preparedSession) => setAuthSession(preparedSession))
        .catch((error) => {
          console.error('Error preparing auth session:', error);
          setAuthSession(session);
        })
        .finally(() => setIsAuthLoading(false));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [prepareAuthSession, showAlert]);

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
      if (isAuthLoading) return;

      try {
        const params = new URLSearchParams(window.location.search);
        const tournamentIdFromUrl = params.get('tournamentId');
        getOrCreateUserId();
        const cachedTournament = loadTournamentData();
        const restoreTournament = (tournamentData) => {
          setResultTournament(null);
          setTournament(tournamentData);
          setScreen('tournament');
          saveActiveTournamentId(tournamentData.id);
          window.history.replaceState({ screen: 'tournament', selectedGroup: null }, '', buildTournamentShareUrl(tournamentData));
        };

        if (tournamentIdFromUrl) {
          let remoteTournament = null;
          let loadError = null;
          try {
            remoteTournament = await fetchTournamentById(tournamentIdFromUrl);
          } catch (error) {
            loadError = error;
            console.error('Error loading tournament from URL:', error);
          }

          if (!active) {
            return;
          }

          const cachedTournamentForUrl = cachedTournament?.id === tournamentIdFromUrl ? cachedTournament : null;
          const tournamentToOpen = remoteTournament || cachedTournamentForUrl;
          if (tournamentToOpen) {
            restoreTournament(tournamentToOpen);
          } else {
            showAlert(
              loadError ? 'Tournament Sync Failed' : 'Tournament Not Found',
              loadError
                ? 'Could not load this tournament. Check your connection and try again.'
                : 'This tournament link appears to be invalid or has been removed.'
            );
            const fallbackScreen = isAuthAvailable() && !authSession ? 'auth' : 'home';
            setScreen(fallbackScreen);
            saveActiveTournamentId(null);
            window.history.replaceState({ screen: fallbackScreen, selectedGroup: null }, '', window.location.pathname);
          }
          historyReady.current = true;
          return;
        }

        const activeTournamentId = loadActiveTournamentId();
        if (cachedTournament?.id && activeTournamentId === cachedTournament.id) {
          if (!active) {
            return;
          }
          restoreTournament(cachedTournament);
          historyReady.current = true;
          return;
        }

        if (isAuthAvailable() && !authSession) {
          setTournament(null);
          setResultTournament(null);
          setScreen('auth');
          saveActiveTournamentId(null);
          window.history.replaceState({ screen: 'auth', selectedGroup: null }, '', window.location.pathname);
          historyReady.current = true;
          return;
        }

        if (!active) {
          return;
        }

        setTournament(null);
        setResultTournament(null);
        setScreen('home');
        saveActiveTournamentId(null);
        window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
      } catch (error) {
        console.error('Error initializing app:', error);
        if (!active) {
          return;
        }
        showAlert('Error', 'Could not load tournament data.');
        setResultTournament(null);
        setScreen('home');
        saveActiveTournamentId(null);
        window.history.replaceState({ screen: 'home', selectedGroup: null }, '', window.location.href);
      }
      historyReady.current = true;
    };

    initialize();

    return () => {
      active = false;
      detachSubscription();
    };
  }, [authSession, detachSubscription, isAuthLoading, showAlert]);

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

  const resumeTournament = useCallback(
    (tournamentData) => {
      setResultTournament(null);
      setTournament(tournamentData);
      navigateToScreen('tournament');
    },
    [navigateToScreen]
  );

  const openTournamentResult = useCallback(
    (tournamentData) => {
      setResultTournament(tournamentData);
      navigateToScreen('tournamentResult');
    },
    [navigateToScreen]
  );

  useEffect(() => {
    if (tournament?.id) {
      attachSubscription(tournament.id);
      saveActiveTournamentId(tournament.id);
      const nextShareUrl = buildTournamentShareUrl({ id: tournament.id, scoreToken: tournament.scoreToken });
      setShareLink(nextShareUrl);
      if (window.location.href !== nextShareUrl) {
        window.history.replaceState({ screen: 'tournament', selectedGroup }, '', nextShareUrl);
      }
    } else {
      setShareLink('');
      if (historyReady.current) {
        saveActiveTournamentId(null);
      }
      if (historyReady.current && window.location.search.includes('tournamentId')) {
        window.history.replaceState({ screen, selectedGroup }, '', window.location.pathname);
      }
      detachSubscription();
    }
  }, [tournament?.id, tournament?.scoreToken, attachSubscription, detachSubscription, screen, selectedGroup]);

  const navigation = useMemo(() => {
    if (screen === 'loading') return null;
    if (tournament) {
      const formatLabel = tournament.format === 'league' ? 'League Night' : 'Cup Night';
      return {
        label: tournament.groupId ? 'Group' : 'Home',
        contextLabel: tournament.status === 'ended' ? `Ended ${formatLabel}` : formatLabel,
        onBack: () => leaveTournamentView(tournament),
      };
    }
    if (screen === 'groups') return { label: 'Home', contextLabel: 'Groups', onBack: () => navigateToScreen('home') };
    if (screen === 'groupHome') return { label: 'Groups', contextLabel: selectedGroup?.name || 'Group', onBack: () => navigateToScreen('groups', { group: null }) };
    if (screen === 'playersPool') return { label: 'Group', contextLabel: 'Players Pool', onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'startGroupNight') return { label: 'Group', contextLabel: 'Start Night', onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'setup') return { label: 'Home', contextLabel: 'Quick Start', onBack: () => navigateToScreen('home') };
    if (screen === 'history') return { label: 'Home', contextLabel: 'History', onBack: () => navigateToScreen('home') };
    if (screen === 'tournamentResult') return { label: 'History', contextLabel: 'Result', onBack: () => navigateToScreen('history') };
    return { contextLabel: 'Match Day' };
  }, [leaveTournamentView, navigateToScreen, screen, selectedGroup, tournament]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      showAlert('Sign Out Failed', error.message || 'Could not sign out.');
    }
  }, [showAlert]);

  const renderScreen = () => {
    if (screen === 'loading') return <LoadingScreen />;
    if (screen === 'home' && !tournament)
      return <HomeScreen setScreen={navigateToScreen} selectedGroup={selectedGroup} onResumeTournament={resumeTournament} showAlert={showAlert} />;
    if (screen === 'groups' && !tournament) return <GroupListScreen showAlert={showAlert} setScreen={navigateToScreen} setSelectedGroup={setSelectedGroup} />;
    if (screen === 'groupHome' && !tournament)
      return <GroupHomeScreen group={selectedGroup} showAlert={showAlert} setScreen={navigateToScreen} />;
    if (screen === 'playersPool' && !tournament)
      return <PlayersPoolScreen group={selectedGroup} showAlert={showAlert} setScreen={navigateToScreen} />;
    if (screen === 'history' && !tournament)
      return <TournamentHistoryScreen showAlert={showAlert} onOpenTournamentResult={openTournamentResult} />;
    if (screen === 'tournamentResult' && !tournament) {
      return resultTournament ? (
        <TournamentResultScreen
          tournament={resultTournament}
          showAlert={showAlert}
          onResumeTournament={resumeTournament}
          canManageTournament={!isAuthAvailable() || !resultTournament.ownerId || authSession?.user?.id === resultTournament.ownerId}
        />
      ) : (
        <TournamentHistoryScreen showAlert={showAlert} onOpenTournamentResult={openTournamentResult} />
      );
    }
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
          canManageTournament={!isAuthAvailable() || !tournament.ownerId || authSession?.user?.id === tournament.ownerId}
          isReadOnly={tournament.status === 'ended'}
        />
      );
    return <LoadingScreen />;
  };

  const showBottomNav = !tournament && ['home', 'groups', 'groupHome', 'playersPool', 'history'].includes(screen);
  const bottomNavItems = [
    {
      id: 'home',
      label: 'Home',
      icon: <HomeIcon className="h-5 w-5" />,
      active: screen === 'home',
      onClick: () => navigateToScreen('home', { group: selectedGroup }),
    },
    {
      id: 'groups',
      label: 'Groups',
      icon: <UsersIcon className="h-5 w-5" />,
      active: screen === 'groups' || screen === 'groupHome',
      onClick: () => navigateToScreen('groups', { group: null }),
    },
    {
      id: 'quick',
      label: 'Quick',
      icon: <TrophyIcon className="h-5 w-5" />,
      active: screen === 'setup',
      onClick: () => navigateToScreen('setup'),
    },
    {
      id: 'history',
      label: 'History',
      icon: <ListIcon className="h-5 w-5" />,
      active: screen === 'history',
      onClick: () => navigateToScreen('history', { group: selectedGroup }),
    },
  ];
  const isPublicTournamentRoute = Boolean(new URLSearchParams(window.location.search).get('tournamentId'));
  const shouldShowAuth = isAuthAvailable() && !authSession && !isPublicTournamentRoute && !tournament;

  return (
    <>
      {isAuthLoading && isAuthAvailable() ? (
        <LoadingScreen />
      ) : shouldShowAuth ? (
        <AuthScreen showAlert={showAlert} />
      ) : (
    <div className="min-h-dvh bg-[#020D16] text-[#F7F8F7] font-sans">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-0 sm:px-4 sm:py-6">
        <Header
          backLabel={navigation?.label}
          contextLabel={navigation?.contextLabel}
          onBack={navigation?.onBack}
          user={authSession?.user}
          onSignOut={isAuthAvailable() ? handleSignOut : undefined}
        />
        <main className={showBottomNav ? 'pb-24 sm:pb-0' : ''}>{renderScreen()}</main>
        {showBottomNav && <BottomNavigation items={bottomNavItems} />}
      </div>
    </div>
      )}
      {alert.show && (
        <CustomAlert title={alert.title} message={alert.message} onClose={() => setAlert({ show: false, title: '', message: '' })} />
      )}
      <InstallPrompt />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center rounded-b-3xl border-x border-b border-[rgba(255,255,255,0.08)] bg-[#07111B]/95 p-10 shadow-xl shadow-[#020D16]/5">
      <p className="text-lg font-black text-[#BEDC45]">Loading tournament...</p>
    </div>
  );
}

function BottomNavigation({ items }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07111B]/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-[#020D16]/30 backdrop-blur sm:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4 gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black transition ${
              item.active
                ? 'bg-[#BEDC45] text-[#020D16]'
                : item.disabled
                  ? 'cursor-not-allowed text-[#4E5A66]'
                  : 'text-[#8D99A6] hover:bg-[#0A141E] hover:text-[#F7F8F7]'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
