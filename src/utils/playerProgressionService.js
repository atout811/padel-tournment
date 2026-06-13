import { GROUP_PLAYERS_STORAGE_KEY, GROUP_SESSIONS_STORAGE_KEY } from './groupStorageKeys';
import { supabase } from './supabaseClient';
import { normalizePlayerName } from './tournamentRules';

const MIN_RATING = 700;
const WIN_RATING_DELTA = 10;
const LOSS_RATING_DELTA = -6;

const nowIso = () => new Date().toISOString();

const safeInteger = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
};

const nonNegativeInteger = (value, fallback = 0) => Math.max(0, safeInteger(value, fallback));

const isPermissionError = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return error?.code === '42501' || message.includes('row-level security') || message.includes('permission denied');
};

const normalizeLevelValue = (level, fallback = 3) => {
  const numericLevel = safeInteger(level, fallback);
  if (numericLevel < 1) return 1;
  if (numericLevel > 5) return 5;
  return numericLevel;
};

const readLocalJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch (error) {
    console.error(`Error loading ${key}:`, error);
    return [];
  }
};

const saveLocalJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

export const getInitialRatingFromLevel = (level) => {
  switch (normalizeLevelValue(level)) {
    case 1:
      return 850;
    case 2:
      return 950;
    case 4:
      return 1150;
    case 5:
      return 1300;
    case 3:
    default:
      return 1050;
  }
};

export const getLevelFromRating = (rating) => {
  const safeRating = safeInteger(rating, 1000);
  if (safeRating < 900) return 1;
  if (safeRating < 1000) return 2;
  if (safeRating < 1100) return 3;
  if (safeRating < 1250) return 4;
  return 5;
};

export const getPlayerWinRate = (player) => {
  const matchesPlayed = nonNegativeInteger(player?.matchesPlayed ?? player?.matches_played);
  if (!matchesPlayed) return 0;
  return Math.round((nonNegativeInteger(player?.wins) / matchesPlayed) * 100);
};

export const normalizeProgressionPlayer = (player) => {
  const initialLevel = normalizeLevelValue(player?.initialLevel ?? player?.initial_level ?? player?.level);
  const rating = Math.max(MIN_RATING, safeInteger(player?.rating, getInitialRatingFromLevel(initialLevel)));
  const matchesPlayed = nonNegativeInteger(player?.matchesPlayed ?? player?.matches_played);
  const wins = nonNegativeInteger(player?.wins);
  const losses = nonNegativeInteger(player?.losses);

  return {
    id: player?.id,
    groupId: player?.groupId ?? player?.group_id,
    name: player?.name || '',
    initialLevel,
    level: getLevelFromRating(rating),
    rating,
    matchesPlayed,
    wins,
    losses,
    currentStreak: nonNegativeInteger(player?.currentStreak ?? player?.current_streak),
    bestStreak: nonNegativeInteger(player?.bestStreak ?? player?.best_streak),
    lastPlayedAt: player?.lastPlayedAt ?? player?.last_played_at ?? null,
    active: player?.active !== false,
    createdAt: player?.createdAt ?? player?.created_at,
    updatedAt: player?.updatedAt ?? player?.updated_at,
  };
};

const normalizeNameKey = (name) => normalizePlayerName(name).toLowerCase();

const getPlayerName = (player) => {
  if (typeof player === 'string') return normalizePlayerName(player);
  return normalizePlayerName(player?.name);
};

const buildParticipantLookup = (participantMeta = []) => {
  const lookup = new Map();
  participantMeta.forEach((participant) => {
    const nameKey = normalizeNameKey(participant?.name);
    if (!nameKey) return;
    lookup.set(nameKey, participant);
  });
  return lookup;
};

const getParticipantForTeamPlayer = (teamPlayer, participantLookup) => {
  if (teamPlayer?.groupPlayerId) return teamPlayer;
  const playerName = getPlayerName(teamPlayer);
  if (!playerName) return null;
  return participantLookup.get(normalizeNameKey(playerName)) || null;
};

const getCompletedMatches = (tournamentData) =>
  (tournamentData?.matches || []).filter(
    (match) =>
      match?.status === 'completed' &&
      match?.winnerId &&
      match?.teamA?.id &&
      match?.teamB?.id &&
      (match.winnerId === match.teamA.id || match.winnerId === match.teamB.id)
  );

const addPlayerResult = ({ deltas, participantLookup, team, isWin }) => {
  (team?.players || []).forEach((teamPlayer) => {
    const participant = getParticipantForTeamPlayer(teamPlayer, participantLookup);
    if (!participant?.groupPlayerId || participant.source === 'guest') return;

    const groupPlayerId = participant.groupPlayerId;
    const current = deltas.get(groupPlayerId) || {
      groupPlayerId,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      ratingDelta: 0,
      results: [],
    };

    current.matchesPlayed += 1;
    current.ratingDelta += isWin ? WIN_RATING_DELTA : LOSS_RATING_DELTA;
    current.results.push(isWin ? 'win' : 'loss');
    if (isWin) current.wins += 1;
    else current.losses += 1;

    deltas.set(groupPlayerId, current);
  });
};

export const calculatePlayerMatchDeltas = (tournamentData) => {
  const participantLookup = buildParticipantLookup(tournamentData?.participantMeta);
  const deltas = new Map();

  getCompletedMatches(tournamentData).forEach((match) => {
    const winningTeam = match.winnerId === match.teamA.id ? match.teamA : match.teamB;
    const losingTeam = match.winnerId === match.teamA.id ? match.teamB : match.teamA;

    addPlayerResult({ deltas, participantLookup, team: winningTeam, isWin: true });
    addPlayerResult({ deltas, participantLookup, team: losingTeam, isWin: false });
  });

  return [...deltas.values()];
};

const applyResultsToStreaks = ({ currentStreak, bestStreak, results }) => {
  let nextCurrentStreak = nonNegativeInteger(currentStreak);
  let nextBestStreak = nonNegativeInteger(bestStreak);

  results.forEach((result) => {
    if (result === 'win') {
      nextCurrentStreak += 1;
      nextBestStreak = Math.max(nextBestStreak, nextCurrentStreak);
      return;
    }
    nextCurrentStreak = 0;
  });

  return { currentStreak: nextCurrentStreak, bestStreak: nextBestStreak };
};

const buildUpdatedProgression = (player, delta, timestamp) => {
  const current = normalizeProgressionPlayer(player);
  const nextRating = Math.max(MIN_RATING, current.rating + safeInteger(delta.ratingDelta));
  const nextLevel = getLevelFromRating(nextRating);
  const streaks = applyResultsToStreaks({
    currentStreak: current.currentStreak,
    bestStreak: current.bestStreak,
    results: delta.results || [],
  });

  return {
    rating: nextRating,
    level: nextLevel,
    matchesPlayed: current.matchesPlayed + nonNegativeInteger(delta.matchesPlayed),
    wins: current.wins + nonNegativeInteger(delta.wins),
    losses: current.losses + nonNegativeInteger(delta.losses),
    currentStreak: streaks.currentStreak,
    bestStreak: streaks.bestStreak,
    lastPlayedAt: timestamp,
    updatedAt: timestamp,
  };
};

const sortLeaderboardPlayers = (players) =>
  [...players].sort((left, right) => {
    const leftPlayer = normalizeProgressionPlayer(left);
    const rightPlayer = normalizeProgressionPlayer(right);
    return (
      rightPlayer.level - leftPlayer.level ||
      rightPlayer.rating - leftPlayer.rating ||
      getPlayerWinRate(rightPlayer) - getPlayerWinRate(leftPlayer) ||
      rightPlayer.wins - leftPlayer.wins ||
      leftPlayer.name.localeCompare(rightPlayer.name)
    );
  });

const applyLocalGroupSessionStats = ({ groupId, sessionId, tournamentData }) => {
  const sessions = readLocalJson(GROUP_SESSIONS_STORAGE_KEY);
  const sessionIndex = sessions.findIndex((session) => session.id === sessionId && session.groupId === groupId);

  if (sessionIndex === -1) return { status: 'not_found', updatedPlayers: 0 };
  if (sessions[sessionIndex].statsApplied || sessions[sessionIndex].stats_applied) {
    return { status: 'already_applied', updatedPlayers: 0 };
  }

  const timestamp = nowIso();
  const deltas = calculatePlayerMatchDeltas(tournamentData);
  const deltaByPlayerId = new Map(deltas.map((delta) => [delta.groupPlayerId, delta]));
  const players = readLocalJson(GROUP_PLAYERS_STORAGE_KEY);

  const nextPlayers = players.map((player) => {
    if (player.groupId !== groupId || !deltaByPlayerId.has(player.id)) return player;
    const updated = buildUpdatedProgression(player, deltaByPlayerId.get(player.id), timestamp);
    return {
      ...player,
      rating: updated.rating,
      level: updated.level,
      matchesPlayed: updated.matchesPlayed,
      wins: updated.wins,
      losses: updated.losses,
      currentStreak: updated.currentStreak,
      bestStreak: updated.bestStreak,
      lastPlayedAt: updated.lastPlayedAt,
      updatedAt: updated.updatedAt,
    };
  });

  const nextSessions = sessions.map((session, index) =>
    index === sessionIndex ? { ...session, statsApplied: true, stats_applied: true, updatedAt: timestamp } : session
  );

  saveLocalJson(GROUP_PLAYERS_STORAGE_KEY, nextPlayers);
  saveLocalJson(GROUP_SESSIONS_STORAGE_KEY, nextSessions);

  return { status: 'applied', updatedPlayers: deltas.length };
};

export const applyGroupSessionStats = async ({ groupId, sessionId, tournamentData }) => {
  if (!groupId || !sessionId || !tournamentData) return { status: 'skipped', updatedPlayers: 0 };
  if (tournamentData.groupId !== groupId || tournamentData.groupSessionId !== sessionId) {
    return { status: 'skipped', updatedPlayers: 0 };
  }

  if (!supabase) {
    return applyLocalGroupSessionStats({ groupId, sessionId, tournamentData });
  }

  const timestamp = nowIso();
  const { data: claimedSession, error: claimError } = await supabase
    .from('group_sessions')
    .update({ stats_applied: true, updated_at: timestamp })
    .eq('id', sessionId)
    .eq('group_id', groupId)
    .eq('stats_applied', false)
    .select('id')
    .maybeSingle();

  if (isPermissionError(claimError)) {
    return { status: 'skipped_no_access', updatedPlayers: 0 };
  }
  if (claimError) throw new Error(`Failed to claim session stats: ${claimError.message}`);
  if (!claimedSession) {
    const { data: session, error: sessionError } = await supabase
      .from('group_sessions')
      .select('id, stats_applied')
      .eq('id', sessionId)
      .eq('group_id', groupId)
      .maybeSingle();

    if (isPermissionError(sessionError)) {
      return { status: 'skipped_no_access', updatedPlayers: 0 };
    }
    if (sessionError) throw new Error(`Failed to check session stats: ${sessionError.message}`);
    if (!session) return { status: 'not_found', updatedPlayers: 0 };
    if (session.stats_applied) return { status: 'already_applied', updatedPlayers: 0 };
    return { status: 'skipped', updatedPlayers: 0 };
  }

  const deltas = calculatePlayerMatchDeltas(tournamentData);
  const playerIds = deltas.map((delta) => delta.groupPlayerId);

  if (playerIds.length > 0) {
    const { data: players, error: playersError } = await supabase
      .from('group_players')
      .select('*')
      .eq('group_id', groupId)
      .in('id', playerIds);

    if (playersError) throw new Error(`Failed to load player stats: ${playersError.message}`);

    const playersById = new Map((players || []).map((player) => [player.id, player]));

    for (const delta of deltas) {
      const player = playersById.get(delta.groupPlayerId);
      if (!player) continue;

      const updated = buildUpdatedProgression(player, delta, timestamp);
      const { error: updateError } = await supabase
        .from('group_players')
        .update({
          rating: updated.rating,
          level: updated.level,
          matches_played: updated.matchesPlayed,
          wins: updated.wins,
          losses: updated.losses,
          current_streak: updated.currentStreak,
          best_streak: updated.bestStreak,
          last_played_at: updated.lastPlayedAt,
          updated_at: updated.updatedAt,
        })
        .eq('id', player.id)
        .eq('group_id', groupId);

      if (updateError) throw new Error(`Failed to update ${player.name}: ${updateError.message}`);
    }
  }

  return { status: 'applied', updatedPlayers: deltas.length };
};

export const fetchGroupLeaderboard = async (groupId) => {
  if (!groupId) return [];

  if (!supabase) {
    const players = readLocalJson(GROUP_PLAYERS_STORAGE_KEY)
      .filter((player) => player.groupId === groupId && player.active !== false)
      .map(normalizeProgressionPlayer);
    return sortLeaderboardPlayers(players);
  }

  const { data, error } = await supabase.from('group_players').select('*').eq('group_id', groupId).eq('active', true);
  if (error) throw new Error(`Failed to load leaderboard: ${error.message}`);
  return sortLeaderboardPlayers((data || []).map(normalizeProgressionPlayer));
};
