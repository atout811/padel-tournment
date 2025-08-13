export const STORAGE_KEY = 'padel-tournament-data';
export const USER_ID_KEY = 'padel-tournament-user-id';

export const getOrCreateUserId = () => {
  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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


