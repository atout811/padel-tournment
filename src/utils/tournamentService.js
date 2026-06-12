import { supabase } from './supabaseClient';
import { createUuid, deleteTournamentData as clearCachedTournament, getOrCreateUserId, isUuid, loadTournamentData as loadCachedTournament, saveTournamentData as cacheTournament } from './storage';

const generateTournamentId = () => createUuid();

const withTimestamps = (tournament) => ({
  ...tournament,
  updatedAt: new Date().toISOString(),
});

export const createTournamentRecord = async (tournament) => {
  const ownerId = getOrCreateUserId();
  const tournamentId = isUuid(tournament.id) ? tournament.id : generateTournamentId();
  const record = withTimestamps({
    ...tournament,
    id: tournamentId,
    ownerId,
  });

  if (!supabase) {
    cacheTournament(record);
    return record;
  }

  const { error } = await supabase
    .from('tournaments')
    .upsert({
      id: record.id,
      owner_id: ownerId,
      data: record,
      updated_at: record.updatedAt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create tournament: ${error.message}`);
  }

  cacheTournament(record);
  return record;
};

export const updateTournamentRecord = async (tournament) => {
  if (!tournament?.id) {
    throw new Error('Tournament id is required to update.');
  }

  const record = withTimestamps(tournament);

  if (!supabase) {
    cacheTournament(record);
    return record;
  }

  const { error } = await supabase
    .from('tournaments')
    .update({
      data: record,
      updated_at: record.updatedAt,
    })
    .eq('id', record.id)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to update tournament: ${error.message}`);
  }

  cacheTournament(record);
  return record;
};

export const fetchTournamentById = async (tournamentId) => {
  if (!tournamentId) {
    return null;
  }

  if (!supabase) {
    const cachedTournament = loadCachedTournament();
    return cachedTournament?.id === tournamentId ? cachedTournament : null;
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('data, owner_id')
    .eq('id', tournamentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tournament: ${error.message}`);
  }

  const tournament = data?.data ? { ...data.data, ownerId: data.owner_id || data.data.ownerId } : null;

  if (tournament) {
    cacheTournament(tournament);
  }

  return tournament;
};

export const removeTournamentRecord = async (tournamentId) => {
  if (!tournamentId || !supabase || !isUuid(tournamentId)) {
    clearCachedTournament();
    return;
  }

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`);
  }

  clearCachedTournament();
};

export const subscribeToTournament = (tournamentId, handler) => {
  if (!tournamentId) {
    return () => {};
  }

  let pollTimer = null;

  const startPolling = () => {
    if (pollTimer) return;
    pollTimer = setInterval(async () => {
      try {
        const latest = await fetchTournamentById(tournamentId);
        if (latest) {
          handler(latest);
        }
      } catch (error) {
        console.error('Polling error while syncing tournament:', error);
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  if (!supabase) {
    startPolling();
    return () => stopPolling();
  }

  const channel = supabase
    .channel(`public:tournaments:id=eq.${tournamentId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tournaments',
        filter: `id=eq.${tournamentId}`,
      },
      (payload) => {
        if (payload.new?.data) {
          const updatedTournament = {
            ...payload.new.data,
            ownerId: payload.new.owner_id || payload.new.data.ownerId,
          };
          cacheTournament(updatedTournament);
          handler(updatedTournament);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        stopPolling();
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        startPolling();
      }
    });

  startPolling();

  return () => {
    stopPolling();
    supabase.removeChannel(channel);
  };
};

export const buildTournamentShareUrl = (tournamentId) => {
  if (!tournamentId) {
    return window.location.href;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('tournamentId', tournamentId);
  return url.toString();
};
