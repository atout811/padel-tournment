import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext } from './i18nContext.js';
import { LANGUAGE_STORAGE_KEY, defaultLanguage, languages, translations } from './translations.js';

const getLanguageMeta = (language) => languages.find((item) => item.code === language) || languages[0];

const normalizeLanguage = (language) => {
  if (language === 'ar' || language?.toLowerCase?.().startsWith('ar')) return 'ar-EG';
  return languages.some((item) => item.code === language) ? language : defaultLanguage;
};

const getInitialLanguage = () => {
  if (typeof window === 'undefined') return defaultLanguage;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored) return normalizeLanguage(stored);
  return normalizeLanguage(window.navigator.language);
};

const getValue = (source, key) =>
  key.split('.').reduce((current, part) => (current && Object.prototype.hasOwnProperty.call(current, part) ? current[part] : undefined), source);

const interpolate = (template, params) =>
  String(template).replace(/\{\{(\w+)\}\}/g, (_, token) => (params[token] ?? params[token] === 0 ? String(params[token]) : ''));

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(getInitialLanguage);
  const meta = getLanguageMeta(language);

  useEffect(() => {
    document.documentElement.lang = meta.htmlLang;
    document.documentElement.dir = meta.dir;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language, meta.dir, meta.htmlLang]);

  const setLanguage = useCallback((nextLanguage) => {
    setLanguageState(normalizeLanguage(nextLanguage));
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => (current === 'ar-EG' ? 'en' : 'ar-EG'));
  }, []);

  const t = useCallback(
    (key, params = {}) => {
      const localized = getValue(translations[language], key);
      const fallback = getValue(translations[defaultLanguage], key);
      return interpolate(localized ?? fallback ?? key, params);
    },
    [language]
  );

  const formatDate = useCallback(
    (value, options = { day: 'numeric', month: 'short' }) => {
      const date = value ? new Date(value) : null;
      if (!date || Number.isNaN(date.getTime())) return t('common.noDate');
      return new Intl.DateTimeFormat(language, { numberingSystem: 'latn', ...options }).format(date);
    },
    [language, t]
  );

  const value = useMemo(
    () => ({
      language,
      languages,
      dir: meta.dir,
      isRtl: meta.dir === 'rtl',
      t,
      formatDate,
      setLanguage,
      toggleLanguage,
    }),
    [formatDate, language, meta.dir, setLanguage, t, toggleLanguage]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
