export const STORAGE_KEY = 'padel-tournament-data';
export const USER_ID_KEY = 'padel-tournament-user-id';
export const ACTIVE_TOURNAMENT_ID_KEY = 'padel-active-tournament-id';
export const TOURNAMENT_HISTORY_KEY = 'padel-tournament-history';

export const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export const createUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === 'x' ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
};

export const getOrCreateUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!isUuid(userId)) {
    userId = createUuid();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
};

export const loadTournamentData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading tournament data:', error);
    return null;
  }
};

export const loadActiveTournamentId = () => {
  try {
    return localStorage.getItem(ACTIVE_TOURNAMENT_ID_KEY) || null;
  } catch (error) {
    console.error('Error loading active tournament id:', error);
    return null;
  }
};

export const saveActiveTournamentId = (tournamentId) => {
  try {
    if (tournamentId) {
      localStorage.setItem(ACTIVE_TOURNAMENT_ID_KEY, tournamentId);
    } else {
      localStorage.removeItem(ACTIVE_TOURNAMENT_ID_KEY);
    }
    return true;
  } catch (error) {
    console.error('Error saving active tournament id:', error);
    return false;
  }
};

export const saveTournamentData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving tournament data:', error);
    return false;
  }
};

export const loadTournamentHistory = () => {
  try {
    const data = localStorage.getItem(TOURNAMENT_HISTORY_KEY);
    const parsedData = data ? JSON.parse(data) : [];
    return Array.isArray(parsedData) ? parsedData.filter((item) => item?.id) : [];
  } catch (error) {
    console.error('Error loading tournament history:', error);
    return [];
  }
};

export const saveTournamentHistoryRecord = (data) => {
  try {
    if (!data?.id) return false;
    const history = loadTournamentHistory();
    const nextHistory = [data, ...history.filter((item) => item.id !== data.id)];
    localStorage.setItem(TOURNAMENT_HISTORY_KEY, JSON.stringify(nextHistory));
    return true;
  } catch (error) {
    console.error('Error saving tournament history:', error);
    return false;
  }
};

export const deleteTournamentHistoryRecord = (tournamentId) => {
  try {
    if (!tournamentId) return false;
    const history = loadTournamentHistory();
    localStorage.setItem(TOURNAMENT_HISTORY_KEY, JSON.stringify(history.filter((item) => item.id !== tournamentId)));
    return true;
  } catch (error) {
    console.error('Error deleting tournament history:', error);
    return false;
  }
};

export const deleteTournamentData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_TOURNAMENT_ID_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting tournament data:', error);
    return false;
  }
};

export const SAVED_PLAYER_NAMES_KEY = 'padel-saved-player-names';
export const WELCOME_LAST_SHOWN_KEY = 'padel-welcome-last-shown';
export const WELCOME_COOLDOWN_MS = 60 * 60 * 1000;

export const shouldShowWelcome = (now = Date.now()) => {
  // Session storage still avoids repeated intros if persistent storage is blocked.
  for (const type of ['localStorage', 'sessionStorage']) {
    try {
      const lastShown = Number(window[type].getItem(WELCOME_LAST_SHOWN_KEY));
      if (Number.isFinite(lastShown) && lastShown > 0 && lastShown <= now && now - lastShown < WELCOME_COOLDOWN_MS) return false;
    } catch { /* Browser storage is optional. */ }
  }
  return true;
};

export const markWelcomeShown = (now = Date.now()) => {
  for (const type of ['localStorage', 'sessionStorage']) {
    try { window[type].setItem(WELCOME_LAST_SHOWN_KEY, String(now)); }
    catch { /* The animation must never prevent opening the app. */ }
  }
};

const cleanPlayerNames = (names) => {
  const seen = new Set();
  return names.filter((name) => typeof name === 'string').map((name) => name.trim().replace(/\s+/g, ' ')).filter((name) => {
    const key = name.toLowerCase();
    if (!name || name.length > 28 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const loadSavedPlayerNames = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(SAVED_PLAYER_NAMES_KEY) || '[]');
    const pastPlayers = [loadTournamentData(), ...loadTournamentHistory()].flatMap((item) => Array.isArray(item?.players) ? item.players : []);
    return cleanPlayerNames([...(Array.isArray(stored) ? stored : []), ...pastPlayers]);
  } catch {
    return [];
  }
};

export const rememberPlayerNames = (names) => {
  const next = cleanPlayerNames([...names, ...loadSavedPlayerNames()]);
  try { localStorage.setItem(SAVED_PLAYER_NAMES_KEY, JSON.stringify(next)); }
  catch { /* Keep setup usable when browser storage is unavailable. */ }
  return next;
};
