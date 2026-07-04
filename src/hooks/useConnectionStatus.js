import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../utils/supabaseClient.js';

const getOnlineState = () => {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
};

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(getOnlineState);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(getOnlineState());

    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);

    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  return useMemo(() => {
    if (!isOnline) {
      return {
        tone: 'offline',
        labelKey: 'sync.offline',
        detailKey: 'sync.offlineDetail',
      };
    }

    if (!supabase) {
      return {
        tone: 'local',
        labelKey: 'sync.local',
        detailKey: 'sync.localDetail',
      };
    }

    return {
      tone: 'cloud',
      labelKey: 'sync.cloud',
      detailKey: 'sync.cloudDetail',
    };
  }, [isOnline]);
};
