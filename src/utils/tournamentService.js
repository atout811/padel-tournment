import { supabase } from './supabaseClient';
import { deleteTournamentData as clearCachedTournament, getOrCreateUserId, loadTournamentData as loadCachedTournament, saveTournamentData as cacheTournament } from './storage';

const generateTournamentId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tour_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const withTimestamps = (tournament) => ({
  ...tournament,
  updatedAt: new Date().toISOString(),
});

export const createTournamentRecord = async (tournament) => {
  const ownerId = getOrCreateUserId();
  const tournamentId = tournament.id || generateTournamentId();
  const record = withTimestamps({
    ...tournament,
    id: tournamentId,
    ownerId,
  });

  cacheTournament(record);

  if (!supabase) {
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

  return record;
};

export const updateTournamentRecord = async (tournament) => {
  if (!tournament?.id) {
    throw new Error('Tournament id is required to update.');
  }

  const record = withTimestamps(tournament);
  cacheTournament(record);

  if (!supabase) {
    return record;
  }

  const { error } = await supabase
    .from('tournaments')
    .update({
      data: record,
      updated_at: record.updatedAt,
    })
    .eq('id', record.id);

  if (error) {
    throw new Error(`Failed to update tournament: ${error.message}`);
  }

  return record;
};

export const fetchTournamentById = async (tournamentId) => {
  if (!tournamentId) {
    return null;
  }

  if (!supabase) {
    return loadCachedTournament();
  }

  const { data, error } = await supabase
    .from('tournaments')
    .select('data')
    .eq('id', tournamentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load tournament: ${error.message}`);
  }

  const tournament = data?.data || null;

  if (tournament) {
    cacheTournament(tournament);
  }

  return tournament;
};

export const removeTournamentRecord = async (tournamentId) => {
  clearCachedTournament();

  if (!tournamentId || !supabase) {
    return;
  }

  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', tournamentId);

  if (error) {
    throw new Error(`Failed to delete tournament: ${error.message}`);
  }
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
          cacheTournament(payload.new.data);
          handler(payload.new.data);
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
