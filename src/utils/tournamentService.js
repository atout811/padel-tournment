import { getCurrentOwnerId, supabase } from './supabaseClient';
import { createUuid, deleteTournamentData as clearCachedTournament, isUuid, loadTournamentData as loadCachedTournament, saveTournamentData as cacheTournament } from './storage';

const generateTournamentId = () => createUuid();
const SCORE_TOKEN_PARAM = 'scoreToken';

const withTimestamps = (tournament) => ({
  ...tournament,
  updatedAt: new Date().toISOString(),
});

const generateScoreToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const hashScoreToken = async (token) => {
  if (!token || !crypto?.subtle) return null;
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const getScoreTokenFromUrl = (tournamentId) => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('tournamentId') !== tournamentId) return null;
  return params.get(SCORE_TOKEN_PARAM);
};

const removePrivateTournamentFields = (tournament) => {
  const publicTournament = { ...(tournament || {}) };
  delete publicTournament.scoreToken;
  return publicTournament;
};

const getCachedScoreToken = (tournamentId) => {
  const cachedTournament = loadCachedTournament();
  return cachedTournament?.id === tournamentId ? cachedTournament.scoreToken || null : null;
};

const attachAvailableScoreToken = (tournament) => {
  if (!tournament?.id) return tournament;
  const scoreToken = tournament.scoreToken || getScoreTokenFromUrl(tournament.id) || getCachedScoreToken(tournament.id);
  return scoreToken ? { ...tournament, scoreToken } : tournament;
};

const isPermissionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied');
};

export const createTournamentRecord = async (tournament) => {
  const ownerId = await getCurrentOwnerId();
  const tournamentId = isUuid(tournament.id) ? tournament.id : generateTournamentId();
  const scoreToken = tournament.scoreToken || generateScoreToken();
  const record = withTimestamps({
    ...tournament,
    id: tournamentId,
    ownerId,
    scoreToken,
  });

  if (!supabase) {
    cacheTournament(record);
    return record;
  }

  const scoreTokenHash = await hashScoreToken(scoreToken);
  if (!scoreTokenHash) throw new Error('Failed to prepare tournament share token.');
  const publicRecord = removePrivateTournamentFields(record);

  const { error } = await supabase
    .from('tournaments')
    .upsert({
      id: record.id,
      owner_id: ownerId,
      data: publicRecord,
      score_token_hash: scoreTokenHash,
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

  const record = withTimestamps(tournament.scoreToken ? tournament : { ...tournament, scoreToken: generateScoreToken() });

  if (!supabase) {
    cacheTournament(record);
    return record;
  }

  const publicRecord = removePrivateTournamentFields(record);
  const scoreTokenHash = await hashScoreToken(record.scoreToken);

  const updatePayload = {
    data: publicRecord,
    updated_at: record.updatedAt,
  };
  if (scoreTokenHash) {
    updatePayload.score_token_hash = scoreTokenHash;
  }

  const { error } = await supabase
    .from('tournaments')
    .update(updatePayload)
    .eq('id', record.id)
    .select('id')
    .single();

  if (error && record.scoreToken && isPermissionError(error)) {
    const { data, error: rpcError } = await supabase.rpc('update_shared_tournament_score', {
      p_tournament_id: record.id,
      p_score_token: record.scoreToken,
      p_tournament_data: publicRecord,
    });

    if (rpcError) {
      throw new Error(`Failed to update tournament: ${rpcError.message}`);
    }

    const sharedRecord = attachAvailableScoreToken({ ...(data || publicRecord), id: record.id, scoreToken: record.scoreToken });
    cacheTournament(sharedRecord);
    return sharedRecord;
  }

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

  const tournament = data?.data ? attachAvailableScoreToken({ ...data.data, ownerId: data.owner_id || data.data.ownerId }) : null;

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
          const tournamentWithToken = attachAvailableScoreToken(updatedTournament);
          cacheTournament(tournamentWithToken);
          handler(tournamentWithToken);
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

export const buildTournamentShareUrl = (tournament) => {
  const tournamentId = typeof tournament === 'string' ? tournament : tournament?.id;
  if (!tournamentId) {
    return window.location.href;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('tournamentId', tournamentId);
  const scoreToken = typeof tournament === 'string' ? getCachedScoreToken(tournamentId) : tournament?.scoreToken;
  if (scoreToken) {
    url.searchParams.set(SCORE_TOKEN_PARAM, scoreToken);
  }
  return url.toString();
};
