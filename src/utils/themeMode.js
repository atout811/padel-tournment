export const THEME_STORAGE_KEY = 'padel-night-theme';
export const THEME_MODES = {
  dark: 'dark',
  light: 'light',
};

const THEME_COLORS = {
  dark: '#161F21',
  light: '#F6F3EC',
};

export const normalizeThemeMode = (themeMode) => (themeMode === THEME_MODES.light ? THEME_MODES.light : THEME_MODES.dark);

export const getStoredThemeMode = () => {
  if (typeof window === 'undefined') return THEME_MODES.light;

  try {
    return normalizeThemeMode(window.localStorage.getItem(THEME_STORAGE_KEY) || THEME_MODES.light);
  } catch {
    return THEME_MODES.light;
  }
};

export const applyThemeMode = (themeMode) => {
  if (typeof document === 'undefined') return;

  const normalizedTheme = normalizeThemeMode(themeMode);
  document.documentElement.dataset.theme = normalizedTheme;
  document.documentElement.style.colorScheme = normalizedTheme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[normalizedTheme]);
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', normalizedTheme === THEME_MODES.light ? 'default' : 'black-translucent');
};

export const saveThemeMode = (themeMode) => {
  const normalizedTheme = normalizeThemeMode(themeMode);
  applyThemeMode(normalizedTheme);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  } catch {
    // Theme remains applied for the current session if storage is unavailable.
  }

  return normalizedTheme;
};

export const initializeThemeMode = () => {
  const themeMode = getStoredThemeMode();
  applyThemeMode(themeMode);
  return themeMode;
};
