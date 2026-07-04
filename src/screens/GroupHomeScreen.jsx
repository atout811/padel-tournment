import React, { useEffect, useState } from 'react';
import { fetchGroupLeaderboard, getInitialRatingFromLevel, getPlayerWinRate, calculatePlayerMatchDeltas } from '../utils/playerProgressionService';
import { CourtIcon, UsersIcon } from '../components/Icons';
import { Button, EmptyState, PageHeader, Panel, ScreenShell } from '../components/Ui.jsx';
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
      <ScreenShell>
        <Button onClick={() => setScreen('groups')}>
          Back to Groups
        </Button>
      </ScreenShell>
    );
  }

  const readiness = getNightReadiness(activePlayers.length);
  const seasonStory = buildSeasonStory(activePlayers);

  return (
    <ScreenShell withBottomNav>
      <PageHeader
        eyebrow="Group Night"
        title={group.name}
        detail={readiness.detail}
      />

      <StartTonightPanel
        readiness={readiness}
        playerCount={activePlayers.length}
        onStartNight={() => setScreen('startGroupNight')}
        onOpenPool={() => setScreen('playersPool')}
      />
      <GroupSnapshot
        players={activePlayers}
        story={seasonStory}
        lastNightStory={lastNightStory}
        onOpenPool={() => setScreen('playersPool')}
      />
    </ScreenShell>
  );
}

function loadGroupRace(groupId) {
  return fetchGroupLeaderboard(groupId);
}

function StartTonightPanel({ readiness, playerCount, onStartNight, onOpenPool }) {
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{readiness.label}</p>
          <h3 className="mt-1 text-2xl font-black leading-tight text-club-ink">Start Tonight</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-club-muted">
            {playerCount} friend{playerCount === 1 ? '' : 's'} saved for this group.
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-56">
          <Button onClick={onStartNight} size="lg" className="w-full">
            <CourtIcon className="h-5 w-5" />
            Start Tonight
          </Button>
          <Button tone="secondary" onClick={onOpenPool} className="w-full">
            <UsersIcon className="h-5 w-5" />
            Friend Cards
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function GroupSnapshot({ players, story, lastNightStory, onOpenPool }) {
  const topNames = players.slice(0, 3).map((player) => player.name).join(', ');

  return (
    <Panel>
      {players.length ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-club-ink">Snapshot</h3>
          </div>
          <div className="space-y-2">
            <SnapshotLine label="Leader" value={story.leader.title} detail={story.leader.detail} />
            <SnapshotLine label="Next" value={story.chaser.title} detail={story.chaser.detail} />
            <SnapshotLine
              label="Last night"
              value={lastNightStory ? lastNightStory.championName : 'No result yet'}
              detail={lastNightStory ? `${lastNightStory.dateLabel} / ${lastNightStory.formatLabel}` : 'Finish a night to save it here.'}
            />
            <SnapshotLine
              label="Top cards"
              value={topNames}
              detail={players.length > 3 ? `${players.length - 3} more in Friend Cards` : 'All saved friends are shown.'}
            />
          </div>
        </div>
      ) : (
        <EmptyState title="Add players to start." detail="Friend Cards make tonight a two-tap setup." action={<Button onClick={onOpenPool}>Open Friend Cards</Button>} />
      )}
    </Panel>
  );
}

function SnapshotLine({ label, value, detail }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] gap-3 rounded-lg bg-club-wash px-3 py-2.5">
      <p className="text-xs font-black uppercase tracking-wide text-club-muted">{label}</p>
      <div className="min-w-0">
        <p className="truncate text-sm font-black text-club-ink">{value}</p>
        {detail && <p className="mt-0.5 truncate text-xs font-semibold text-club-muted">{detail}</p>}
      </div>
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
      detail: leader.matchesPlayed ? `${leader.rating} rating / ${getPlayerWinRate(leader)}% win rate` : `${leader.rating} rating / no matches yet`,
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
