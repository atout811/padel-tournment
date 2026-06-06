export const DEFAULT_SCORING_SETTINGS = {
  matchFormat: 'bestOf3',
  maxSets: 3,
  setsToWin: 2,
  deuceMode: 'advantage',
};

export const FAST_SCORING_SETTINGS = {
  matchFormat: 'fast',
  maxSets: 1,
  setsToWin: 1,
  deuceMode: 'golden',
};

const POINT_LABELS = ['0', '15', '30', '40'];

export const buildScoringSettings = ({ maxSets = 3, deuceMode = 'advantage' } = {}) => {
  const normalizedMaxSets = Number(maxSets) === 5 ? 5 : Number(maxSets) === 1 ? 1 : 3;
  return {
    matchFormat: normalizedMaxSets === 1 && deuceMode === 'golden' ? 'fast' : `bestOf${normalizedMaxSets}`,
    maxSets: normalizedMaxSets,
    setsToWin: Math.floor(normalizedMaxSets / 2) + 1,
    deuceMode: deuceMode === 'golden' ? 'golden' : 'advantage',
  };
};

export const normalizeScoringSettings = (settings) => {
  if (!settings) return DEFAULT_SCORING_SETTINGS;
  const maxSets = Number(settings.maxSets || DEFAULT_SCORING_SETTINGS.maxSets);
  return {
    ...DEFAULT_SCORING_SETTINGS,
    ...settings,
    maxSets,
    setsToWin: Number(settings.setsToWin || Math.floor(maxSets / 2) + 1),
    deuceMode: settings.deuceMode === 'golden' ? 'golden' : 'advantage',
  };
};

const createSet = () => ({
  teamAPoints: 0,
  teamBPoints: 0,
  winnerId: null,
});

export const createInitialPadelScore = (settings) => ({
  version: 2,
  settings: normalizeScoringSettings(settings),
  sets: [createSet()],
  currentSetIndex: 0,
  winnerId: null,
  isComplete: false,
});

export const getCurrentSet = (score) => score.sets[score.currentSetIndex] || score.sets[score.sets.length - 1];

export const getSetsWon = (score, teamAId, teamBId) => {
  return score.sets.reduce(
    (acc, set) => {
      if (set.winnerId === teamAId) acc.teamA += 1;
      if (set.winnerId === teamBId) acc.teamB += 1;
      return acc;
    },
    { teamA: 0, teamB: 0 }
  );
};

export const getPointLabel = (teamPoints, opponentPoints, deuceMode = 'advantage') => {
  if (teamPoints >= 3 && opponentPoints >= 3) {
    if (teamPoints === opponentPoints) return deuceMode === 'golden' ? '40' : 'Deuce';
    if (deuceMode === 'advantage' && teamPoints === opponentPoints + 1) return 'Ad';
  }

  return POINT_LABELS[Math.min(teamPoints, 3)];
};

export const getSetStatusLabel = (score) => {
  const currentSet = getCurrentSet(score);
  const settings = normalizeScoringSettings(score.settings);
  if (!currentSet || score.isComplete) return 'Match complete';
  if (currentSet.teamAPoints >= 3 && currentSet.teamBPoints >= 3) {
    if (settings.deuceMode === 'golden' && currentSet.teamAPoints === currentSet.teamBPoints) return 'Golden point';
    if (currentSet.teamAPoints === currentSet.teamBPoints) return 'Deuce';
    return 'Advantage';
  }
  return 'Current set';
};

export const advancePadelPoint = (score, pointWinnerSide, teamAId, teamBId, rawSettings) => {
  if (score.isComplete) return score;

  const settings = normalizeScoringSettings(rawSettings || score.settings);
  const nextScore = JSON.parse(JSON.stringify({ ...score, settings }));
  const currentSet = getCurrentSet(nextScore);
  const side = pointWinnerSide === 'teamB' ? 'teamB' : 'teamA';
  const otherSide = side === 'teamA' ? 'teamB' : 'teamA';
  const sideKey = side === 'teamA' ? 'teamAPoints' : 'teamBPoints';
  const otherSideKey = otherSide === 'teamA' ? 'teamAPoints' : 'teamBPoints';

  currentSet[sideKey] += 1;

  const hasWonSet =
    currentSet[sideKey] >= 4 &&
    (currentSet[sideKey] - currentSet[otherSideKey] >= 2 ||
      (settings.deuceMode === 'golden' && currentSet[sideKey] === 4 && currentSet[otherSideKey] === 3));

  if (!hasWonSet) return nextScore;

  finishSet(nextScore, side === 'teamA' ? teamAId : teamBId, teamAId, teamBId, settings);
  return nextScore;
};

export const awardPadelSet = (score, setWinnerSide, teamAId, teamBId, rawSettings) => {
  if (score.isComplete) return score;

  const settings = normalizeScoringSettings(rawSettings || score.settings);
  const nextScore = JSON.parse(JSON.stringify({ ...score, settings }));
  const side = setWinnerSide === 'teamB' ? 'teamB' : 'teamA';
  const currentSet = getCurrentSet(nextScore);

  currentSet.teamAPoints = side === 'teamA' ? 4 : 0;
  currentSet.teamBPoints = side === 'teamB' ? 4 : 0;
  finishSet(nextScore, side === 'teamA' ? teamAId : teamBId, teamAId, teamBId, settings);
  return nextScore;
};

const finishSet = (score, setWinnerId, teamAId, teamBId, settings) => {
  const currentSet = getCurrentSet(score);
  currentSet.winnerId = setWinnerId;
  const setsWon = getSetsWon(score, teamAId, teamBId);
  const winnerSideSets = setWinnerId === teamAId ? setsWon.teamA : setsWon.teamB;

  if (winnerSideSets >= settings.setsToWin) {
    score.winnerId = setWinnerId;
    score.isComplete = true;
    return;
  }

  if (score.sets.length < settings.maxSets) {
    score.sets.push(createSet());
    score.currentSetIndex = score.sets.length - 1;
  }
};

export const formatSetScore = (set) => {
  const teamAPoints = Number(set.teamAPoints ?? set.teamAGames ?? 0);
  const teamBPoints = Number(set.teamBPoints ?? set.teamBGames ?? 0);
  return `${getPointLabel(teamAPoints, teamBPoints)}-${getPointLabel(teamBPoints, teamAPoints)}`;
};

export const summarizePadelScore = (score, teamAId, teamBId) => {
  if (!score?.sets) return null;
  if (teamAId && teamBId) {
    const setsWon = getSetsWon(score, teamAId, teamBId);
    return `${setsWon.teamA}-${setsWon.teamB} sets`;
  }

  const completedSets = score.sets.filter((set) => set.winnerId);
  if (completedSets.length === 0) return formatSetScore(getCurrentSet(score));
  return completedSets.map((set, index) => `S${index + 1}: ${formatSetScore(set)}`).join('  ');
};
