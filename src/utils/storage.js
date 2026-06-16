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
