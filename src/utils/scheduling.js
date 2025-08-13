// Fair distribution to avoid back-to-back matches for teams
export const distributeMatchesFairly = (matches) => {
  if (matches.length <= 1) return matches;

  const result = [];
  const remaining = [...matches];
  const teamLastPlayed = new Map();

  while (remaining.length > 0) {
    let bestMatch = null;
    let bestIndex = -1;
    let longestWait = -1;

    for (let i = 0; i < remaining.length; i++) {
      const match = remaining[i];
      const teamAId = match.teamA.id;
      const teamBId = match.teamB.id;
      const lastMatch = result[result.length - 1];

      if (lastMatch) {
        const lastTeams = new Set([lastMatch.teamA.id, lastMatch.teamB.id]);
        const conflictsWithLast = lastTeams.has(teamAId) || lastTeams.has(teamBId);
        const existsNonConflicting = remaining.some((rm) => {
          const a = rm.teamA.id;
          const b = rm.teamB.id;
          return !(lastTeams.has(a) || lastTeams.has(b));
        });
        if (conflictsWithLast && existsNonConflicting) {
          continue;
        }
      }

      const teamAWait = teamLastPlayed.has(teamAId) ? result.length - teamLastPlayed.get(teamAId) : result.length + 1;
      const teamBWait = teamLastPlayed.has(teamBId) ? result.length - teamLastPlayed.get(teamBId) : result.length + 1;
      const minWait = Math.min(teamAWait, teamBWait);

      if (minWait > longestWait) {
        longestWait = minWait;
        bestMatch = match;
        bestIndex = i;
      }
    }

    if (bestMatch) {
      result.push(bestMatch);
      remaining.splice(bestIndex, 1);
      teamLastPlayed.set(bestMatch.teamA.id, result.length - 1);
      teamLastPlayed.set(bestMatch.teamB.id, result.length - 1);
    }
  }

  return result;
};

// Round-robin scheduling helpers
const BYE_ID = '__BYE__';

export const generateRoundRobinRounds = (teams) => {
  const teamsList = [...teams];
  if (teamsList.length % 2 !== 0) {
    teamsList.push({ id: BYE_ID, players: ['BYE', 'BYE'] });
  }

  const n = teamsList.length; // even
  const roundsCount = n - 1;
  let arrangement = [...teamsList];
  const rounds = [];

  for (let r = 0; r < roundsCount; r++) {
    const pairings = [];
    for (let i = 0; i < n / 2; i++) {
      const home = arrangement[i];
      const away = arrangement[n - 1 - i];
      if (home.id === BYE_ID || away.id === BYE_ID) continue;
      if (r % 2 === 0) {
        pairings.push({ teamA: home, teamB: away });
      } else {
        pairings.push({ teamA: away, teamB: home });
      }
    }
    rounds.push(pairings);

    const fixed = arrangement[0];
    const rotated = [fixed, arrangement[n - 1], ...arrangement.slice(1, n - 1)];
    arrangement = rotated;
  }

  return rounds;
};

export const interleaveRoundsAvoidConsecutive = (rounds) => {
  const queues = rounds.map((r) => [...r]);
  const result = [];
  let lastTeams = new Set();

  const totalMatches = queues.reduce((sum, q) => sum + q.length, 0);
  while (result.length < totalMatches) {
    let picked = false;
    for (let ri = 0; ri < queues.length; ri++) {
      const q = queues[ri];
      if (q.length === 0) continue;
      let idx = -1;
      for (let mi = 0; mi < q.length; mi++) {
        const m = q[mi];
        const aId = m.teamA.id;
        const bId = m.teamB.id;
        if (!lastTeams.has(aId) && !lastTeams.has(bId)) {
          idx = mi;
          break;
        }
      }
      if (idx !== -1) {
        const [m] = q.splice(idx, 1);
        result.push(m);
        lastTeams = new Set([m.teamA.id, m.teamB.id]);
        picked = true;
        break;
      }
    }

    if (!picked) {
      for (let ri = 0; ri < queues.length; ri++) {
        const q = queues[ri];
        if (q.length === 0) continue;
        const m = q.shift();
        result.push(m);
        lastTeams = new Set([m.teamA.id, m.teamB.id]);
        break;
      }
    }
  }

  return result;
};

export const generateLeagueMatches = (teams) => {
  let matchId = 0;
  const firstLegRounds = generateRoundRobinRounds(teams);
  const firstLegOrdered = interleaveRoundsAvoidConsecutive(firstLegRounds);
  const firstLegMatches = firstLegOrdered.map((pair) => ({
    id: `round1_match_${matchId++}`,
    round: 1,
    teamA: pair.teamA,
    teamB: pair.teamB,
    winnerId: null,
    status: 'pending',
  }));

  const secondLegRounds = firstLegRounds.map((r) => r.map(({ teamA, teamB }) => ({ teamA: teamB, teamB: teamA })));
  const secondLegOrdered = interleaveRoundsAvoidConsecutive(secondLegRounds);
  const secondLegMatches = secondLegOrdered.map((pair) => ({
    id: `round2_match_${matchId++}`,
    round: 2,
    teamA: pair.teamA,
    teamB: pair.teamB,
    winnerId: null,
    status: 'pending',
  }));

  return [...firstLegMatches, ...secondLegMatches];
};


