import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { CustomAlert, ToastViewport } from './components/Alert.jsx';
import { SkeletonBlock } from './components/Skeleton.jsx';
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
import { HomeIcon, ListIcon, UsersIcon } from './components/Icons.jsx';
import { claimLegacyOwnerData, getAuthSession, isAuthAvailable, onAuthStateChanged, signOut } from './utils/authService';
import { fetchGroups } from './utils/groupService';
import { getOrCreateUserId, loadActiveTournamentId, loadTournamentData, saveActiveTournamentId } from './utils/storage';
import { buildTournamentShareUrl, fetchTournamentById, subscribeToTournament } from './utils/tournamentService';
import { useI18n } from './i18n/useI18n.js';

const getTimestamp = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getShortcutScreen = (shortcut) => {
  if (shortcut === 'start') return 'setup';
  if (shortcut === 'groups') return 'groups';
  if (shortcut === 'history') return 'history';
  return null;
};

export default function App() {
  const { t } = useI18n();
  const [tournament, setTournament] = useState(null);
  const [resultTournament, setResultTournament] = useState(null);
  const [screen, setScreen] = useState('loading');
  const [alert, setAlert] = useState({ show: false, title: '', message: '' });
  const [toasts, setToasts] = useState([]);
  const [shareLink, setShareLink] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [authSession, setAuthSession] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(isAuthAvailable());
  const subscriptionCleanup = useRef(null);
  const historyReady = useRef(false);
  const claimedOwnerRef = useRef(null);
  const focusRefreshRef = useRef({ tournamentId: null, at: 0 });
  const toastIdRef = useRef(0);

  const showAlert = useCallback((title, message) => setAlert({ show: true, title, message }), []);
  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);
  const showToast = useCallback(
    (title, message = '', tone = 'info') => {
      toastIdRef.current += 1;
      const id = `toast-${Date.now()}-${toastIdRef.current}`;
      setToasts((current) => [...current.slice(-2), { id, title, message, tone }]);
      if (typeof window !== 'undefined') {
        window.setTimeout(() => dismissToast(id), 2600);
      }
    },
    [dismissToast]
  );

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
        showAlert(t('alerts.dataMigrationFailed'), t('alerts.dataMigrationMessage'));
      }

      return session;
    },
    [showAlert, t]
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
        showAlert(t('alerts.loginError'), t('alerts.loginErrorMessage'));
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
  }, [prepareAuthSession, showAlert, t]);

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
        const shortcutScreen = getShortcutScreen(params.get('shortcut'));
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
              loadError ? t('alerts.tournamentSyncFailed') : t('alerts.tournamentNotFound'),
              loadError
                ? t('alerts.tournamentSyncFailedMessage')
                : t('alerts.tournamentNotFoundMessage')
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

        const initialScreen = shortcutScreen || 'home';
        setTournament(null);
        setResultTournament(null);
        setScreen(initialScreen);
        saveActiveTournamentId(null);
        window.history.replaceState({ screen: initialScreen, selectedGroup: null }, '', window.location.pathname);
      } catch (error) {
        console.error('Error initializing app:', error);
        if (!active) {
          return;
        }
        showAlert(t('alerts.error'), t('alerts.loadTournamentError'));
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
  }, [authSession, detachSubscription, isAuthLoading, showAlert, t]);

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

  const activeTournamentId = tournament?.id;

  useEffect(() => {
    if (!activeTournamentId) {
      return undefined;
    }

    let active = true;

    const refreshTournament = async () => {
      if (document.visibilityState === 'hidden') return;

      const now = Date.now();
      if (focusRefreshRef.current.tournamentId === activeTournamentId && now - focusRefreshRef.current.at < 3000) {
        return;
      }

      focusRefreshRef.current = { tournamentId: activeTournamentId, at: now };

      try {
        const latest = await fetchTournamentById(activeTournamentId);
        if (!active || !latest) return;

        let didApplyUpdate = false;
        setTournament((current) => {
          if (!current || current.id !== latest.id) return current;

          const incomingTimestamp = getTimestamp(latest.updatedAt);
          const existingTimestamp = getTimestamp(current.updatedAt);
          if (incomingTimestamp && existingTimestamp && incomingTimestamp <= existingTimestamp) {
            return current;
          }
          if (!incomingTimestamp && latest.updatedAt === current.updatedAt) {
            return current;
          }

          didApplyUpdate = true;
          return latest;
        });

        if (didApplyUpdate) {
          showToast(t('sync.updated'), t('sync.updatedDetail'), 'info');
        }
      } catch (error) {
        console.error('Error refreshing tournament after app focus:', error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshTournament();
      }
    };

    window.addEventListener('focus', refreshTournament);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener('focus', refreshTournament);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTournamentId, showToast, t]);

  useEffect(() => {
    if (screen === 'loading' || screen === 'auth') return;

    const hasUsefulState =
      Boolean(tournament?.id || selectedGroup?.id) ||
      ['groups', 'groupHome', 'playersPool', 'startGroupNight', 'setup', 'history', 'tournamentResult'].includes(screen);

    if (hasUsefulState) {
      window.dispatchEvent(new Event('padel-night:useful-action'));
    }
  }, [screen, selectedGroup?.id, tournament?.id]);

  const navigation = useMemo(() => {
    if (screen === 'loading') return null;
    if (tournament) {
      const formatLabel = tournament.format === 'league' ? t('nav.leagueNight') : t('nav.cupNight');
      return {
        label: tournament.groupId ? t('nav.group') : t('nav.home'),
        contextLabel: tournament.status === 'ended' ? t('nav.ended', { format: formatLabel }) : formatLabel,
        onBack: () => leaveTournamentView(tournament),
      };
    }
    if (screen === 'groups') return { label: t('nav.home'), contextLabel: t('nav.groups'), onBack: () => navigateToScreen('home') };
    if (screen === 'groupHome') return { label: t('nav.groups'), contextLabel: selectedGroup?.name || t('nav.group'), onBack: () => navigateToScreen('groups', { group: null }) };
    if (screen === 'playersPool') return { label: t('nav.group'), contextLabel: t('nav.playersPool'), onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'startGroupNight') return { label: t('nav.group'), contextLabel: t('nav.startNight'), onBack: () => navigateToScreen(selectedGroup ? 'groupHome' : 'groups', { group: selectedGroup }) };
    if (screen === 'setup') return { label: t('nav.home'), contextLabel: t('nav.quickStart'), onBack: () => navigateToScreen('home') };
    if (screen === 'history') return { label: t('nav.home'), contextLabel: t('nav.history'), onBack: () => navigateToScreen('home') };
    if (screen === 'tournamentResult') return { label: t('nav.history'), contextLabel: t('nav.result'), onBack: () => navigateToScreen('history') };
    return { contextLabel: t('nav.matchDay') };
  }, [leaveTournamentView, navigateToScreen, screen, selectedGroup, t, tournament]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
      showAlert(t('alerts.signOutFailed'), error.message || t('alerts.signOutFailed'));
    }
  }, [showAlert, t]);

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
          showToast={showToast}
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
          showToast={showToast}
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
      label: t('nav.home'),
      icon: <HomeIcon className="h-5 w-5" />,
      active: screen === 'home',
      onClick: () => navigateToScreen('home', { group: selectedGroup }),
    },
    {
      id: 'groups',
      label: t('nav.groups'),
      icon: <UsersIcon className="h-5 w-5" />,
      active: screen === 'groups' || screen === 'groupHome',
      onClick: () => navigateToScreen('groups', { group: null }),
    },
    {
      id: 'history',
      label: t('nav.history'),
      icon: <ListIcon className="h-5 w-5" />,
      active: screen === 'history',
      onClick: () => navigateToScreen('history', { group: selectedGroup }),
    },
  ];
  const isPublicTournamentRoute = Boolean(new URLSearchParams(window.location.search).get('tournamentId'));
  const shouldShowAuth = isAuthAvailable() && !authSession && !isPublicTournamentRoute && !tournament;
  const screenTransitionKey = `${screen}:${tournament?.id || resultTournament?.id || selectedGroup?.id || 'root'}`;

  return (
    <>
      {isAuthLoading && isAuthAvailable() ? (
        <LoadingScreen />
      ) : shouldShowAuth ? (
        <AuthScreen showAlert={showAlert} />
      ) : (
    <div className="min-h-dvh bg-club-bg text-club-ink font-sans">
      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-0 sm:px-4 sm:py-5">
        <Header
          backLabel={navigation?.label}
          contextLabel={navigation?.contextLabel}
          onBack={navigation?.onBack}
          user={authSession?.user}
          onSignOut={isAuthAvailable() ? handleSignOut : undefined}
        />
        <main className={showBottomNav ? 'pb-24 sm:pb-0' : ''}>
          <div key={screenTransitionKey} className="app-screen-enter">
            {renderScreen()}
          </div>
        </main>
        {showBottomNav && <BottomNavigation items={bottomNavItems} />}
      </div>
    </div>
      )}
      {alert.show && (
        <CustomAlert title={alert.title} message={alert.message} onClose={() => setAlert({ show: false, title: '', message: '' })} />
      )}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
      <InstallPrompt />
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center border-x border-b border-club-border bg-club-bg p-6 shadow-xl shadow-club-shadow/5 sm:rounded-b-lg">
      <div className="w-full max-w-sm rounded-lg border border-club-border bg-club-surface p-4">
        <SkeletonBlock className="mx-auto h-12 w-12 rounded-lg bg-club-green/20" />
        <SkeletonBlock className="mx-auto mt-4 h-5 w-40" />
        <SkeletonBlock className="mx-auto mt-2 h-3 w-28" />
      </div>
    </div>
  );
}

function BottomNavigation({ items }) {
  const gridClass = items.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-club-border bg-club-bg/95 px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl shadow-club-shadow/20 backdrop-blur sm:hidden">
      <div className={`mx-auto grid max-w-6xl ${gridClass} gap-1`}>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={item.onClick}
            disabled={item.disabled}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-black transition ${
              item.active
                ? 'motion-soft-pop bg-club-green text-club-greenDeep'
                : item.disabled
                  ? 'cursor-not-allowed text-[#4E5A66]'
                  : 'text-club-muted hover:bg-club-surface hover:text-club-ink'
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
