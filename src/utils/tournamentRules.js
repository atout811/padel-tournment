import { distributeMatchesFairly } from './scheduling.js';

export const MIN_LEAGUE_PLAYERS = 4;
export const MIN_CUP_PLAYERS = 8;
export const MAX_PLAYER_NAME_LENGTH = 28;

export const getGeneratedTeamCount = (playerCount) => Math.ceil(Number(playerCount || 0) / 2);

export const normalizePlayerName = (name) => String(name || '').trim().replace(/\s+/g, ' ');

export const validatePlayerName = (name, players) => {
  const normalizedName = normalizePlayerName(name);

  if (!normalizedName) {
    return { isValid: false, name: normalizedName, message: 'Enter a player name first.' };
  }

  if (normalizedName.length > MAX_PLAYER_NAME_LENGTH) {
    return {
      isValid: false,
      name: normalizedName,
      message: `Keep player names under ${MAX_PLAYER_NAME_LENGTH} characters.`,
    };
  }

  const alreadyExists = players.some((player) => player.toLowerCase() === normalizedName.toLowerCase());
  if (alreadyExists) {
    return { isValid: false, name: normalizedName, message: 'That player is already on the list.' };
  }

  return { isValid: true, name: normalizedName, message: '' };
};

export const getSetupStatus = (players, format) => {
  const playerCount = players.length;
  const teamCount = getGeneratedTeamCount(playerCount);

  if (format === 'cup') {
    const missingPlayers = Math.max(0, MIN_CUP_PLAYERS - playerCount);
    return {
      isValid: missingPlayers === 0,
      playerCount,
      teamCount,
      minPlayers: MIN_CUP_PLAYERS,
      message:
        missingPlayers === 0
          ? 'Cup is ready: group stage, semifinals, then a final.'
          : `Cup needs at least 4 teams, so add ${missingPlayers} more player${missingPlayers === 1 ? '' : 's'} or choose League.`,
    };
  }

  const missingPlayers = Math.max(0, MIN_LEAGUE_PLAYERS - playerCount);
  return {
    isValid: missingPlayers === 0,
    playerCount,
    teamCount,
    minPlayers: MIN_LEAGUE_PLAYERS,
    message:
      missingPlayers === 0
        ? 'League is ready: every team plays across two rounds.'
        : `League needs ${missingPlayers} more player${missingPlayers === 1 ? '' : 's'} to start.`,
  };
};

const getMatchTeamIds = (match) => [match?.teamA?.id, match?.teamB?.id].filter(Boolean);

export const selectActiveMatches = (pendingMatches, courtCount, preferredMatchId) => {
  const safeCourtCount = Math.max(1, Math.min(Number(courtCount || 1), 3));
  const preferredMatch = pendingMatches.find((match) => match.id === preferredMatchId);
  const rest = pendingMatches.filter((match) => match.id !== preferredMatchId);
  const orderedMatches = [...(preferredMatch ? [preferredMatch] : []), ...distributeMatchesFairly(rest)];
  let bestBatch = [];
  let bestOrderScore = Number.POSITIVE_INFINITY;

  const isBetterBatch = (candidate, orderScore) => {
    const candidateHasPreferred = preferredMatch && candidate.some((match) => match.id === preferredMatch.id);
    const bestHasPreferred = preferredMatch && bestBatch.some((match) => match.id === preferredMatch.id);

    return (
      candidate.length > bestBatch.length ||
      (candidate.length === bestBatch.length && candidateHasPreferred && !bestHasPreferred) ||
      (candidate.length === bestBatch.length && candidateHasPreferred === bestHasPreferred && orderScore < bestOrderScore)
    );
  };

  const search = (startIndex, candidate, usedTeamIds, orderScore) => {
    if (isBetterBatch(candidate, orderScore)) {
      bestBatch = candidate;
      bestOrderScore = orderScore;
    }

    if (candidate.length >= safeCourtCount) return;

    for (let index = startIndex; index < orderedMatches.length; index++) {
      const match = orderedMatches[index];
      const teamIds = getMatchTeamIds(match);
      const hasConflict = teamIds.some((teamId) => usedTeamIds.has(teamId));
      if (hasConflict) continue;

      const nextUsedTeamIds = new Set(usedTeamIds);
      teamIds.forEach((teamId) => nextUsedTeamIds.add(teamId));
      search(index + 1, [...candidate, match], nextUsedTeamIds, orderScore + index);
    }
  };

  search(0, [], new Set(), 0);

  return bestBatch;
};

export const emptyTeamStats = () => ({
  points: 0,
  wins: 0,
  losses: 0,
  scored: 0,
  conceded: 0,
  diff: 0,
});

const getPadelSetTotals = (score, teamAId, teamBId) => {
  if (!score?.sets) return null;

  return score.sets
    .filter((set) => set.winnerId)
    .reduce(
      (totals, set) => ({
        teamA: totals.teamA + (set.winnerId === teamAId ? 1 : 0),
        teamB: totals.teamB + (set.winnerId === teamBId ? 1 : 0),
      }),
      { teamA: 0, teamB: 0 }
    );
};

export const buildTeamStats = (tournament) => {
  const stats = new Map((tournament?.teams || []).map((team) => [team.id, emptyTeamStats()]));

  (tournament?.matches || []).forEach((match) => {
    if (match.status !== 'completed' || !match.winnerId) return;

    const teamAStats = stats.get(match.teamA.id);
    const teamBStats = stats.get(match.teamB.id);
    if (!teamAStats || !teamBStats) return;

    if (match.winnerId === match.teamA.id) {
      teamAStats.points += 3;
      teamAStats.wins += 1;
      teamBStats.losses += 1;
    } else if (match.winnerId === match.teamB.id) {
      teamBStats.points += 3;
      teamBStats.wins += 1;
      teamAStats.losses += 1;
    }

    const padelSetTotals = getPadelSetTotals(match.score, match.teamA.id, match.teamB.id);
    const teamAScore = padelSetTotals ? padelSetTotals.teamA : Number(match.score?.teamA);
    const teamBScore = padelSetTotals ? padelSetTotals.teamB : Number(match.score?.teamB);

    if (Number.isFinite(teamAScore) && Number.isFinite(teamBScore)) {
      teamAStats.scored += teamAScore;
      teamAStats.conceded += teamBScore;
      teamBStats.scored += teamBScore;
      teamBStats.conceded += teamAScore;
    }
  });

  stats.forEach((value) => {
    value.diff = value.scored - value.conceded;
  });

  return stats;
};

export const buildLeaderboard = (tournament) => {
  const teamStats = buildTeamStats(tournament);
  const leaderboard = [...(tournament?.teams || [])].sort((a, b) => {
    const statsA = teamStats.get(a.id) || emptyTeamStats();
    const statsB = teamStats.get(b.id) || emptyTeamStats();
    return statsB.points - statsA.points || statsB.wins - statsA.wins || statsB.diff - statsA.diff;
  });

  return { leaderboard, teamStats };
};

export const syncTeamPointsFromMatches = (tournament) => {
  const teamStats = buildTeamStats(tournament);
  return {
    ...tournament,
    teams: tournament.teams.map((team) => ({
      ...team,
      points: teamStats.get(team.id)?.points || 0,
    })),
  };
};
