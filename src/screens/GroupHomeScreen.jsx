import React, { useEffect, useState } from 'react';
import { fetchGroupLeaderboard, getInitialRatingFromLevel, getPlayerWinRate, calculatePlayerMatchDeltas } from '../utils/playerProgressionService';
import { CourtIcon, UsersIcon } from '../components/Icons';
import { subscribeToGroupPlayers } from '../utils/groupPlayerService';
import { fetchTournamentHistory } from '../utils/tournamentService';
import { buildLeaderboard } from '../utils/tournamentRules';

export default function GroupHomeScreen({ group, showAlert, setScreen }) {
  const [activePlayers, setActivePlayers] = useState([]);
  const [lastNightStory, setLastNightStory] = useState(null);

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    loadGroupRace(group.id)
      .then((players) => {
        if (active) setActivePlayers(players);
      })
      .catch((error) => {
        console.error('Error loading group players:', error);
        showAlert('Error', 'Could not load group players.');
      });
    return () => {
      active = false;
    };
  }, [group?.id, showAlert]);

  useEffect(() => {
    if (!group?.id) return undefined;
    return subscribeToGroupPlayers(group.id, () => {
      loadGroupRace(group.id)
        .then(setActivePlayers)
        .catch((error) => console.error('Error syncing group race:', error));
    });
  }, [group?.id]);

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    fetchTournamentHistory()
      .then((history) => {
        if (!active) return;
        setLastNightStory(buildLastNightStory(history, group.id));
      })
      .catch((error) => {
        console.error('Error loading group history:', error);
        if (active) setLastNightStory(null);
      });
    return () => {
      active = false;
    };
  }, [group?.id]);

  if (!group) {
    return (
      <div className="rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-6">
        <button type="button" onClick={() => setScreen('groups')} className="rounded-2xl bg-[#BEDC45] px-5 py-3 font-black text-[#020D16]">
          Back to Groups
        </button>
      </div>
    );
  }

  const readiness = getNightReadiness(activePlayers.length);
  const seasonStory = buildSeasonStory(activePlayers);

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6">
      <section className="overflow-hidden rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] shadow-lg shadow-[#020D16]/20">
        <div className="p-4 sm:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">Weekly Night</span>
              <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{readiness.label}</span>
            </div>
            <h2 className="mt-3 break-words text-3xl font-black leading-tight text-[#F7F8F7] sm:text-4xl">{group.name}</h2>
            <p className="mt-2 text-sm font-bold text-[#CFD2D3]">{readiness.detail}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setScreen('startGroupNight')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-5 font-black text-[#020D16] transition hover:bg-[#D3F05A]"
              >
                <CourtIcon className="h-5 w-5" />
                Start Tonight's Games
              </button>
              <button
                type="button"
                onClick={() => setScreen('playersPool')}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-5 font-black text-[#F7F8F7] transition hover:bg-[#0D1823]"
              >
                <UsersIcon className="h-5 w-5 text-[#BEDC45]" />
                Player Cards
              </button>
            </div>
          </div>
        </div>
      </section>

      <LastNightStrip story={lastNightStory} onStartNight={() => setScreen('startGroupNight')} />
      <LeaderboardCard players={activePlayers.slice(0, 3)} story={seasonStory} onOpenPool={() => setScreen('playersPool')} onStartNight={() => setScreen('startGroupNight')} />
    </div>
  );
}

function loadGroupRace(groupId) {
  return fetchGroupLeaderboard(groupId);
}

function LastNightStrip({ story, onStartNight }) {
  if (!story) {
    return (
      <section className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#0A141E] px-3 py-2">
        <div>
          <h3 className="text-sm font-black text-[#F7F8F7]">Last Night</h3>
          <p className="text-xs font-semibold text-[#8D99A6]">First result unlocks this.</p>
        </div>
        <button type="button" onClick={onStartNight} className="min-h-9 shrink-0 rounded-xl bg-[#BEDC45] px-3 text-xs font-black text-[#020D16] hover:bg-[#D3F05A]">
          Start One
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-[#1F60D1]/45 bg-[#0A141E] px-3 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full bg-[#1F60D1]/20 px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-wide text-[#CFD2D3]">Last Night</span>
          <span className="truncate text-xs font-bold text-[#8D99A6]">{story.dateLabel}</span>
          <span className="rounded-full bg-[#07111B] px-2 py-0.5 text-[0.58rem] font-black uppercase tracking-wide text-[#8D99A6]">{story.formatLabel}</span>
        </div>
        <div className="grid min-w-0 gap-1.5 sm:grid-cols-3 sm:gap-2">
          <CompactStoryItem label="Champions" value={story.championName} />
          <CompactStoryItem label="MVP" value={story.mvpName} />
          <CompactStoryItem label="Rising" value={story.risingName} />
        </div>
      </div>
    </section>
  );
}

function CompactStoryItem({ label, value }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl bg-[#07111B] px-2.5 py-1.5">
      <span className="shrink-0 text-[0.56rem] font-black uppercase tracking-wide text-[#8D99A6]">{label}</span>
      <span className="min-w-0 truncate text-xs font-black text-[#F7F8F7]">{value}</span>
    </div>
  );
}

function LeaderboardCard({ players, story, onOpenPool, onStartNight }) {
  return (
    <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-black text-[#F7F8F7]">Group Race</h3>
          <p className="truncate text-sm font-semibold text-[#8D99A6]">{story.hook}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={onOpenPool} className="rounded-2xl border border-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-black text-[#8D99A6] hover:bg-[#07111B]">
            Cards
          </button>
          <button type="button" onClick={onStartNight} className="rounded-2xl bg-[#BEDC45] px-4 py-2 text-sm font-black text-[#020D16] hover:bg-[#D3F05A]">
            Play
          </button>
        </div>
      </div>

      {players.length ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <StoryBadge label="Current #1" value={story.leader.title} />
            <StoryBadge label="Next Threat" value={story.chaser.title} />
            <StoryBadge label="Rising" value={story.improved.title} />
          </div>
          {players.map((player, index) => (
            <div key={player.id} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
              <span className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${index === 0 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate font-black text-[#F7F8F7]">{player.name}</p>
                <p className="mt-0.5 text-xs font-bold text-[#8D99A6]">
                  {player.matchesPlayed ? `${player.wins}W ${player.losses}L / ${getPlayerWinRate(player)}%` : 'Fresh player'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-[#BEDC45]">Level {player.level}</p>
                <p className="text-sm font-black tabular-nums text-[#F7F8F7]">{player.rating}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-8 text-center text-sm font-bold text-[#8D99A6]">Add players to start.</p>
      )}
    </section>
  );
}

function StoryBadge({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#07111B] px-3 py-2">
      <p className="truncate text-[0.58rem] font-black uppercase tracking-wide text-[#8D99A6]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-[#F7F8F7]">{value}</p>
    </div>
  );
}

function buildSeasonStory(players) {
  if (!players.length) {
    return {
      hook: 'Add players to start the race.',
      leader: { title: 'Open spot', detail: 'No ranking yet' },
      chaser: { title: 'Open chase', detail: 'Play once to create a chase' },
      improved: { title: 'First mover', detail: 'No movement yet' },
    };
  }

  const rankedPlayers = [...players].sort(
    (left, right) =>
      Number(right.rating || 0) - Number(left.rating || 0) ||
      getPlayerWinRate(right) - getPlayerWinRate(left) ||
      Number(right.wins || 0) - Number(left.wins || 0) ||
      left.name.localeCompare(right.name)
  );
  const leader = rankedPlayers[0];
  const chaser = rankedPlayers[1] || null;
  const improved = [...players].sort((left, right) => getImprovement(right) - getImprovement(left) || Number(right.rating || 0) - Number(left.rating || 0) || left.name.localeCompare(right.name))[0];
  const leaderRating = Number(leader?.rating || 0);
  const chaserGap = chaser ? Math.max(0, leaderRating - Number(chaser.rating || 0)) : 0;
  const improvedDelta = getImprovement(improved);

  return {
    hook: chaser ? getChaseHook({ chaser, leader, gap: chaserGap }) : `${leader.name} leads. Add one more rival.`,
    leader: {
      title: leader.name,
      detail: `${leader.rating} rating / ${getPlayerWinRate(leader)}% win rate`,
    },
    chaser: chaser
      ? {
          title: chaser.name,
          detail: chaserGap ? `${chaserGap} pts back` : 'Level on rating',
        }
      : { title: 'No rival yet', detail: 'Add another active player' },
    improved: {
      title: improved?.name || 'No player yet',
      detail: improvedDelta > 0 ? `+${improvedDelta} pts` : 'No jump yet',
    },
  };
}

function buildLastNightStory(history, groupId) {
  const tournaments = Array.isArray(history) ? history : [];
  const lastTournament = tournaments
    .filter((tournament) => tournament?.groupId === groupId && isFinishedTournament(tournament))
    .sort((left, right) => getTournamentTime(right) - getTournamentTime(left))[0];

  if (!lastTournament) return null;

  const { leaderboard } = buildLeaderboard(lastTournament);
  const champion = getChampion(lastTournament, leaderboard);
  const playerMovement = buildPlayerMovement(lastTournament);
  const bestRatingDelta = playerMovement.length ? Math.max(...playerMovement.map((player) => player.ratingDelta)) : 0;
  const bestRankMove = playerMovement.length ? Math.max(...playerMovement.map((player) => player.rankMovement)) : 0;
  const mvp = playerMovement.find((player) => player.ratingDelta === bestRatingDelta && bestRatingDelta > 0);
  const rising = playerMovement.find((player) => player.rankMovement === bestRankMove && bestRankMove > 0) || mvp;

  return {
    dateLabel: formatDate(lastTournament.endedAt || lastTournament.updatedAt || lastTournament.createdAt),
    formatLabel: lastTournament.format === 'league' ? 'League' : 'Cup',
    championName: champion ? champion.players.join(' & ') : 'Pending',
    mvpName: mvp ? `${mvp.name} ${formatSignedNumber(mvp.ratingDelta)}` : 'No MVP',
    risingName: rising ? `${rising.name} ${formatRankMovement(rising.rankMovement)}` : 'No climber yet',
  };
}

function isFinishedTournament(tournament) {
  const matches = Array.isArray(tournament?.matches) ? tournament.matches : [];
  return tournament?.status === 'ended' || (matches.length > 0 && matches.every((match) => match.status === 'completed'));
}

function getTournamentTime(tournament) {
  const date = new Date(tournament?.endedAt || tournament?.updatedAt || tournament?.createdAt || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function getChampion(tournament, leaderboard) {
  if (tournament?.format === 'league') return leaderboard[0] || null;
  const finalMatch = tournament?.matches?.find((match) => match.matchType === 'final' && match.status === 'completed');
  return finalMatch ? tournament.teams.find((team) => team.id === finalMatch.winnerId) || null : leaderboard[0] || null;
}

function buildPlayerMovement(tournament) {
  const participantMeta = Array.isArray(tournament?.participantMeta) ? tournament.participantMeta : [];
  const groupParticipants = participantMeta
    .filter((participant) => participant?.groupPlayerId && participant.source !== 'guest')
    .map((participant) => ({
      id: participant.groupPlayerId,
      name: String(participant.name || 'Player'),
      previousRating: Math.max(0, Number(participant.rating || 0)),
    }));

  if (!groupParticipants.length) return [];

  const deltaByPlayerId = new Map(calculatePlayerMatchDeltas(tournament).map((delta) => [delta.groupPlayerId, Number(delta.ratingDelta || 0)]));
  const players = groupParticipants.map((participant) => ({
    ...participant,
    ratingDelta: deltaByPlayerId.get(participant.id) || 0,
    nextRating: Math.max(0, participant.previousRating + (deltaByPlayerId.get(participant.id) || 0)),
  }));
  const previousRanks = buildRankMap(players, 'previousRating');
  const nextRanks = buildRankMap(players, 'nextRating');

  return players
    .map((player) => {
      const previousRank = previousRanks.get(player.id) || 0;
      const nextRank = nextRanks.get(player.id) || previousRank;
      return {
        ...player,
        previousRank,
        nextRank,
        rankMovement: previousRank - nextRank,
      };
    })
    .sort(
      (left, right) =>
        right.ratingDelta - left.ratingDelta ||
        right.rankMovement - left.rankMovement ||
        right.nextRating - left.nextRating ||
        left.name.localeCompare(right.name)
    );
}

function buildRankMap(players, ratingKey) {
  return new Map(
    [...players]
      .sort((left, right) => Number(right[ratingKey] || 0) - Number(left[ratingKey] || 0) || left.name.localeCompare(right.name))
      .map((player, index) => [player.id, index + 1])
  );
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(date) : 'No date';
}

function formatSignedNumber(value) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${number}`;
}

function formatRankMovement(value) {
  const movement = Number(value || 0);
  if (movement > 0) return `up ${movement}`;
  if (movement < 0) return `down ${Math.abs(movement)}`;
  return 'same';
}

function getImprovement(player) {
  const startingRating = getInitialRatingFromLevel(player?.initialLevel || player?.level);
  return Number(player?.rating || startingRating) - startingRating;
}

function getChaseHook({ chaser, leader, gap }) {
  if (gap <= 0) return `${chaser.name} is level with ${leader.name} on rating.`;
  return `${chaser.name} is ${gap} pt${gap === 1 ? '' : 's'} from ${leader.name}.`;
}

function getNightReadiness(playerCount) {
  if (playerCount >= 8) {
    return { label: 'Cup Ready', detail: `${playerCount} friends are ready for a full cup night.` };
  }
  if (playerCount >= 4) {
    return { label: 'League Ready', detail: `${playerCount} friends are ready for a league night.` };
  }
  const missingPlayers = 4 - playerCount;
  return {
    label: 'Recruiting',
    detail: `${missingPlayers} more needed for league.`,
  };
}
