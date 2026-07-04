import { useCallback, useEffect, useState } from 'react';
import { applyThemeMode, getStoredThemeMode, saveThemeMode, THEME_MODES } from '../utils/themeMode.js';

export const useThemeMode = () => {
  const [themeMode, setThemeMode] = useState(getStoredThemeMode);

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  const toggleThemeMode = useCallback(() => {
    setThemeMode((currentTheme) => saveThemeMode(currentTheme === THEME_MODES.light ? THEME_MODES.dark : THEME_MODES.light));
  }, []);

  return {
    themeMode,
    isLightMode: themeMode === THEME_MODES.light,
    toggleThemeMode,
  };
};
