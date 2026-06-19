import { buildScoringSettings } from './padelScoring';
import { generateLeagueMatches, generateRoundRobinRounds } from './scheduling';
import { reconcileTournamentCourts } from './tournamentRules';

const shufflePlayers = (players) => {
  const shuffledPlayers = [...players];
  for (let index = shuffledPlayers.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffledPlayers[index], shuffledPlayers[swapIndex]] = [shuffledPlayers[swapIndex], shuffledPlayers[index]];
  }
  return shuffledPlayers;
};

const generateCupMatches = (teams) => {
  let matchId = 0;
  return generateRoundRobinRounds(teams).flatMap((roundMatches, scheduleRoundIndex) =>
    roundMatches.map(({ teamA, teamB }) => ({
      id: `round1_match_${matchId++}`,
      round: 1,
      scheduleRound: scheduleRoundIndex + 1,
      teamA,
      teamB,
      winnerId: null,
      status: 'pending',
    }))
  );
};

export const buildTournament = ({
  players,
  format,
  courtCount,
  scoringPreset = 'standard',
  maxSets = 3,
  deuceMode = 'advantage',
  metadata = {},
}) => {
  const shuffledPlayers = shufflePlayers(players);
  const teams = [];

  for (let i = 0; i < Math.floor(shuffledPlayers.length / 2) * 2; i += 2) {
    teams.push({ id: `team_${i / 2 + 1}`, players: [shuffledPlayers[i], shuffledPlayers[i + 1]], points: 0 });
  }

  if (shuffledPlayers.length % 2 !== 0) {
    teams.push({ id: `team_${teams.length + 1}`, players: [shuffledPlayers[shuffledPlayers.length - 1], 'Substitute'], points: 0 });
  }

  const matches = format === 'league' ? generateLeagueMatches(teams) : generateCupMatches(teams);
  const scoringSettings = buildScoringSettings({ maxSets, deuceMode });

  return reconcileTournamentCourts({
    players,
    teams,
    matches,
    substitute: null,
    status: 'active',
    currentRound: 1,
    maxRounds: 2,
    format,
    scoringPreset,
    scoringSettings,
    courtCount,
    createdAt: new Date().toISOString(),
    currentMatchId: matches.find((match) => match.round === 1 && match.status === 'pending')?.id || null,
    ...metadata,
  });
};
