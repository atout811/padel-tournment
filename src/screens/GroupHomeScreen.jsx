import React, { useEffect, useState } from 'react';
import { fetchGroupLeaderboard, getInitialRatingFromLevel, getPlayerWinRate, calculatePlayerMatchDeltas } from '../utils/playerProgressionService';
import { CourtIcon, UsersIcon } from '../components/Icons';
import { Button, EmptyState, PageHeader, Panel, ScreenShell } from '../components/Ui.jsx';
import { subscribeToGroupPlayers } from '../utils/groupPlayerService';
import { fetchTournamentHistory } from '../utils/tournamentService';
import { buildLeaderboard } from '../utils/tournamentRules';
import { useI18n } from '../i18n/useI18n.js';

export default function GroupHomeScreen({ group, showAlert, setScreen }) {
  const { t, formatDate } = useI18n();
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
        showAlert(t('alerts.error'), t('startNight.loadError'));
      });
    return () => {
      active = false;
    };
  }, [group?.id, showAlert, t]);

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
        setLastNightStory(buildLastNightStory(history, group.id, t, formatDate));
      })
      .catch((error) => {
        console.error('Error loading group history:', error);
        if (active) setLastNightStory(null);
      });
    return () => {
      active = false;
    };
  }, [formatDate, group?.id, t]);

  if (!group) {
    return (
      <ScreenShell>
        <Button onClick={() => setScreen('groups')}>
          {t('groupHome.backToGroups')}
        </Button>
      </ScreenShell>
    );
  }

  const readiness = getNightReadiness(activePlayers.length, t);
  const seasonStory = buildSeasonStory(activePlayers, t);

  return (
    <ScreenShell withBottomNav>
      <PageHeader
        eyebrow={t('groupHome.eyebrow')}
        title={group.name}
        detail={readiness.detail}
      />

      <StartTonightPanel
        readiness={readiness}
        playerCount={activePlayers.length}
        onStartNight={() => setScreen('startGroupNight')}
        onOpenPool={() => setScreen('playersPool')}
        t={t}
      />
      <GroupSnapshot
        players={activePlayers}
        story={seasonStory}
        lastNightStory={lastNightStory}
        onOpenPool={() => setScreen('playersPool')}
        t={t}
      />
    </ScreenShell>
  );
}

function loadGroupRace(groupId) {
  return fetchGroupLeaderboard(groupId);
}

function StartTonightPanel({ readiness, playerCount, onStartNight, onOpenPool, t }) {
  return (
    <Panel>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{readiness.label}</p>
          <h3 className="mt-1 text-2xl font-black leading-tight text-club-ink">{t('groupHome.startTonight')}</h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-club-muted">
            {t('groupHome.friendsSaved', { count: playerCount, plural: playerCount === 1 ? '' : 's' })}
          </p>
        </div>
        <div className="grid gap-2 sm:min-w-56">
          <Button onClick={onStartNight} size="lg" className="w-full">
            <CourtIcon className="h-5 w-5" />
            {t('groupHome.startTonight')}
          </Button>
          <Button tone="secondary" onClick={onOpenPool} className="w-full">
            <UsersIcon className="h-5 w-5" />
            {t('groupHome.friendCards')}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function GroupSnapshot({ players, story, lastNightStory, onOpenPool, t }) {
  const topNames = players.slice(0, 3).map((player) => player.name).join(', ');

  return (
    <Panel>
      {players.length ? (
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-base font-black text-club-ink">{t('groupHome.snapshot')}</h3>
          </div>
          <div className="space-y-2">
            <SnapshotLine label={t('groupHome.leader')} value={story.leader.title} detail={story.leader.detail} />
            <SnapshotLine label={t('groupHome.next')} value={story.chaser.title} detail={story.chaser.detail} />
            <SnapshotLine
              label={t('groupHome.lastNight')}
              value={lastNightStory ? lastNightStory.championName : t('groupHome.noResultYet')}
              detail={lastNightStory ? `${lastNightStory.dateLabel} / ${lastNightStory.formatLabel}` : t('groupHome.finishNightDetail')}
            />
            <SnapshotLine
              label={t('groupHome.topCards')}
              value={topNames}
              detail={players.length > 3 ? t('groupHome.moreInFriendCards', { count: players.length - 3 }) : t('groupHome.allFriendsShown')}
            />
          </div>
        </div>
      ) : (
        <EmptyState title={t('groupHome.addPlayersTitle')} detail={t('groupHome.addPlayersDetail')} action={<Button onClick={onOpenPool}>{t('groupHome.openFriendCards')}</Button>} />
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

function buildSeasonStory(players, t) {
  if (!players.length) {
    return {
      hook: t('groupHome.addPlayersRace'),
      leader: { title: t('groupHome.openSpot'), detail: t('groupHome.noRankingYet') },
      chaser: { title: t('groupHome.openChase'), detail: t('groupHome.playOnce') },
      improved: { title: t('groupHome.firstMover'), detail: t('groupHome.noMovementYet') },
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
    hook: chaser ? getChaseHook({ chaser, leader, gap: chaserGap, t }) : t('groupHome.leadsAddRival', { name: leader.name }),
    leader: {
      title: leader.name,
      detail: leader.matchesPlayed ? t('groupHome.ratingWinRate', { rating: leader.rating, winRate: getPlayerWinRate(leader) }) : t('groupHome.ratingNoMatches', { rating: leader.rating }),
    },
    chaser: chaser
      ? {
          title: chaser.name,
          detail: chaserGap ? t('groupHome.pointsBack', { count: chaserGap }) : t('groupHome.levelOnRating'),
        }
      : { title: t('groupHome.noRivalYet'), detail: t('groupHome.addAnotherPlayer') },
    improved: {
      title: improved?.name || t('groupHome.noPlayerYet'),
      detail: improvedDelta > 0 ? `+${improvedDelta}` : t('groupHome.noJumpYet'),
    },
  };
}

function buildLastNightStory(history, groupId, t, formatDateValue) {
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
    dateLabel: formatDateValue(lastTournament.endedAt || lastTournament.updatedAt || lastTournament.createdAt),
    formatLabel: lastTournament.format === 'league' ? t('common.league') : t('common.cup'),
    championName: champion ? champion.players.join(' & ') : t('groupHome.pending'),
    mvpName: mvp ? `${mvp.name} ${formatSignedNumber(mvp.ratingDelta)}` : t('groupHome.noMvp'),
    risingName: rising ? `${rising.name} ${formatRankMovement(rising.rankMovement, t)}` : t('groupHome.noClimberYet'),
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

function formatSignedNumber(value) {
  const number = Number(value || 0);
  return `${number > 0 ? '+' : ''}${number}`;
}

function formatRankMovement(value, t) {
  const movement = Number(value || 0);
  if (movement > 0) return t('groupHome.up', { count: movement });
  if (movement < 0) return t('groupHome.down', { count: Math.abs(movement) });
  return t('groupHome.same');
}

function getImprovement(player) {
  const startingRating = getInitialRatingFromLevel(player?.initialLevel || player?.level);
  return Number(player?.rating || startingRating) - startingRating;
}

function getChaseHook({ chaser, leader, gap, t }) {
  if (gap <= 0) return t('groupHome.levelWith', { chaser: chaser.name, leader: leader.name });
  return t('groupHome.pointsFromLeader', { chaser: chaser.name, leader: leader.name, gap, plural: gap === 1 ? '' : 's' });
}

function getNightReadiness(playerCount, t) {
  if (playerCount >= 8) {
    return { label: t('groupHome.cupReady'), detail: t('groupHome.cupReadyDetail', { count: playerCount }) };
  }
  if (playerCount >= 4) {
    return { label: t('groupHome.leagueReady'), detail: t('groupHome.leagueReadyDetail', { count: playerCount }) };
  }
  const missingPlayers = 4 - playerCount;
  return {
    label: t('groupHome.recruiting'),
    detail: t('groupHome.recruitingDetail', { count: missingPlayers }),
  };
}
