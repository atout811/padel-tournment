export const STORAGE_KEY = 'padel-tournament-data';
export const USER_ID_KEY = 'padel-tournament-user-id';

const isUuid = (value) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

const createUuid = () => {
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

export const saveTournamentData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error saving tournament data:', error);
    return false;
  }
};

export const deleteTournamentData = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error deleting tournament data:', error);
    return false;
  }
};
