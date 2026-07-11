import React, { useEffect, useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import { CheckIcon, ListIcon, ShareIcon } from '../components/Icons';
import { Button, MetricGrid, MetricItem, PageHeader, Panel, Pill, ScreenShell } from '../components/Ui.jsx';
import { fetchGroups } from '../utils/groupService';
import { calculatePlayerMatchDeltas } from '../utils/playerProgressionService';
import { reopenTournamentRecord } from '../utils/tournamentService';
import { buildLeaderboard, emptyTeamStats } from '../utils/tournamentRules';
import { useI18n } from '../i18n/useI18n.js';

const getTeamName = (team) => team.players.join(' & ');

function useResultSharing({ buildPayload, showAlert, t }) {
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

  const handleShareWhatsApp = async () => {
    const payload = buildPayload();
    const shareText = buildResultShareText(payload, t);

    try {
      setIsSharingResult(true);
      setShareFeedback('');

      const imageBlob = await createResultCardBlob(payload);
      const file = imageBlob && typeof File !== 'undefined'
        ? new File([imageBlob], `${slugify(payload.title)}-tournament-summary.png`, { type: 'image/png' })
        : null;

      if (file && navigator.canShare?.({ files: [file], title: `${payload.title} ${t('tournament.share')}`, text: shareText })) {
        await navigator.share({ files: [file], title: `${payload.title} ${t('tournament.share')}`, text: shareText });
        setShareFeedback(t('tournament.shared'));
        return;
      }

      if (imageBlob) {
        downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      }
      openWhatsAppShare(shareText);
      setShareFeedback(imageBlob ? t('tournament.pngDownloaded') : t('tournament.whatsappOpened'));
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing WhatsApp summary:', error);
        showAlert(t('tournament.whatsappShareFailedTitle'), t('tournament.whatsappShareFailedMessage'));
      }
    } finally {
      setIsSharingResult(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

  const handleDownloadResultPng = async () => {
    const payload = buildPayload();

    try {
      setIsDownloadingPng(true);
      const imageBlob = await createResultCardBlob(payload);
      if (!imageBlob) {
        showAlert(t('tournament.downloadUnavailableTitle'), t('tournament.downloadUnavailableMessage'));
        return;
      }
      downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      setShareFeedback(t('tournament.pngDownloaded'));
    } catch (error) {
      console.error('Error downloading tournament summary:', error);
      showAlert(t('tournament.downloadFailedTitle'), t('tournament.downloadFailedMessage'));
    } finally {
      setIsDownloadingPng(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

  return {
    isSharingResult,
    isDownloadingPng,
    shareFeedback,
    handleShareWhatsApp,
    handleDownloadResultPng,
  };
}

export default function TournamentResultScreen({ tournament, showAlert, showToast, onResumeTournament, canManageTournament = false }) {
  const { language, t, formatDate } = useI18n();
  const [groupName, setGroupName] = useState('');
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  const { leaderboard, teamStats } = useMemo(() => buildLeaderboard(tournament), [tournament]);
  const completedMatches = useMemo(() => tournament.matches.filter((match) => match.status === 'completed'), [tournament.matches]);
  const pendingMatches = useMemo(() => tournament.matches.filter((match) => match.status !== 'completed'), [tournament.matches]);
  const isEnded = tournament.status === 'ended';
  const isComplete = tournament.matches.length > 0 && completedMatches.length === tournament.matches.length;
  const formatLabel = tournament.format === 'league' ? t('common.league') : t('common.cup');
  const title = groupName || (tournament.groupId ? t('format.groupNight') : tournament.format === 'league' ? t('format.quickLeagueNight') : t('format.quickCupNight'));
  const dateLabel = formatDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt, { day: 'numeric', month: 'short', year: 'numeric' });
  const statusLabel = isEnded ? t('history.ended') : isComplete ? t('history.complete') : t('history.live');
  const champion = getChampion(tournament, leaderboard);

  useEffect(() => {
    if (!tournament.groupId) {
      setGroupName('');
      return undefined;
    }

    let active = true;
    fetchGroups()
      .then((groups) => {
        if (!active) return;
        setGroupName(groups.find((group) => group.id === tournament.groupId)?.name || '');
      })
      .catch((error) => {
        console.error('Error loading result group name:', error);
        if (active) setGroupName('');
      });

    return () => {
      active = false;
    };
  }, [tournament.groupId]);

  const confirmReopenTournament = async () => {
    try {
      setIsReopening(true);
      const savedTournament = await reopenTournamentRecord(tournament);
      setShowReopenConfirm(false);
      onResumeTournament(savedTournament);
      if (showToast) {
        showToast(t('tournament.reopenedToast'), t('tournament.reopenedToastDetail'), 'success');
      } else {
        showAlert(t('tournament.resultReopenedTitle'), t('tournament.reopenedToastDetail'));
      }
    } catch (error) {
      console.error('Error reopening tournament:', error);
      showAlert(t('alerts.error'), t('tournament.resultReopenError'));
    } finally {
      setIsReopening(false);
    }
  };

  const buildCurrentResultPayload = () =>
    buildResultSharePayload({
      title,
      dateLabel,
      formatLabel,
      champion,
      leaderboard,
      teamStats,
      completedMatches,
      pendingMatches,
      tournament,
      language,
      t,
    });
  const { isSharingResult, isDownloadingPng, shareFeedback, handleShareWhatsApp, handleDownloadResultPng } = useResultSharing({
    buildPayload: buildCurrentResultPayload,
    showAlert,
    t,
  });

  return (
    <ScreenShell className="pb-24 sm:pb-5">
      <PageHeader
        eyebrow={t('nav.result')}
        title={champion ? getTeamName(champion) : t('groupHome.pending')}
        detail={title}
        meta={
          <>
            <Pill tone="green">{statusLabel}</Pill>
            <Pill>{formatLabel}</Pill>
            <span className="inline-flex min-h-7 items-center text-xs font-bold text-club-muted">{dateLabel}</span>
          </>
        }
        actions={
          !isEnded ? (
            <Button onClick={() => onResumeTournament(tournament)}>{t('tournament.resume')}</Button>
          ) : canManageTournament ? (
            <Button onClick={() => setShowReopenConfirm(true)} disabled={isReopening}>{t('tournament.reopen')}</Button>
          ) : null
        }
      />

      <MetricGrid columns={4}>
        <MetricItem label={t('common.teams')} value={tournament.teams.length} />
        <MetricItem label={t('common.done')} value={completedMatches.length} />
        <MetricItem label={t('common.waiting')} value={pendingMatches.length} />
        <MetricItem label={t('common.courts')} value={Math.max(1, Number(tournament.courtCount || 1))} />
      </MetricGrid>

      <ShareResultCard
        title={title}
        dateLabel={dateLabel}
        formatLabel={formatLabel}
        champion={champion}
        leaderboard={leaderboard}
        teamStats={teamStats}
        completedMatches={completedMatches}
        pendingMatches={pendingMatches}
        tournament={tournament}
        isSharing={isSharingResult}
        isDownloading={isDownloadingPng}
        feedback={shareFeedback}
        onShareWhatsApp={handleShareWhatsApp}
        onDownloadPng={handleDownloadResultPng}
        language={language}
        t={t}
      />

      <DetailSection
        icon={<ListIcon className="h-5 w-5 text-club-muted" />}
        title={t('tournament.finalRanking')}
        count={leaderboard.length}
        open={showStandings}
        onToggle={() => setShowStandings((current) => !current)}
        hideLabel={t('common.hide')}
      >
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const stats = teamStats.get(team.id) || emptyTeamStats();
            return <RankingRow key={team.id} team={team} rank={index + 1} stats={stats} />;
          })}
        </div>
      </DetailSection>

      <DetailSection
        icon={<CheckIcon className="h-5 w-5 text-club-muted" />}
        title={t('tournament.matches')}
        count={tournament.matches.length}
        open={showMatches}
        onToggle={() => setShowMatches((current) => !current)}
        hideLabel={t('common.hide')}
      >
        <div className="space-y-2">
          {tournament.matches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}
        </div>
      </DetailSection>

      {showReopenConfirm && (
        <ConfirmationModal
          title={t('tournament.reopenTitle')}
          message={t('tournament.resultReopenMessage')}
          onConfirm={confirmReopenTournament}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}
    </ScreenShell>
  );
}

function DetailSection({ icon, title, count, open, onToggle, hideLabel, children }) {
  return (
    <Panel>
      <button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-1 text-left">
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate text-sm font-black uppercase tracking-wide text-club-ink">{title}</span>
        </span>
        <span className="shrink-0 rounded-md bg-club-wash px-3 py-1 text-xs font-black tabular-nums text-club-green">
          {open ? hideLabel : count}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </Panel>
  );
}

function ShareResultCard({
  title,
  dateLabel,
  formatLabel,
  champion,
  leaderboard,
  teamStats,
  completedMatches,
  pendingMatches,
  tournament,
  isSharing,
  isDownloading,
  feedback,
  onShareWhatsApp,
  onDownloadPng,
  language = 'en',
  t,
}) {
  const payload = buildResultSharePayload({
    title,
    dateLabel,
    formatLabel,
    champion,
    leaderboard,
    teamStats,
    completedMatches,
    pendingMatches,
    tournament,
    language,
    t,
  });

  return (
    <Panel className="overflow-hidden p-0">
      <div className="border-b border-club-border bg-club-soft p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-club-muted">{t('tournament.share')}</p>
            <h3 className="mt-1 text-2xl font-black text-club-ink">{t('tournament.shareNight')}</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_auto]">
            <Button
              tone="whatsapp"
              onClick={onShareWhatsApp}
              disabled={isSharing || isDownloading}
            >
              <ShareIcon className="h-5 w-5" />
              {isSharing ? t('tournament.preparing') : feedback || t('tournament.whatsappPng')}
            </Button>
            <Button
              tone="secondary"
              onClick={onDownloadPng}
              disabled={isSharing || isDownloading}
            >
              {isDownloading ? t('tournament.preparing') : t('tournament.downloadPng')}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-lg border border-club-border bg-club-bg p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="green">{t('app.name')}</Pill>
            <Pill>{formatLabel}</Pill>
            <span className="text-xs font-bold text-club-muted">{dateLabel}</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide text-club-muted">{t('tournament.championsOfNight')}</p>
              <h4 className="mt-1 break-words text-3xl font-black leading-tight text-club-ink">{payload.championName}</h4>
              <p className="mt-2 text-sm font-bold text-club-muted">{title}</p>
            </div>
            <MetricGrid columns={3} className="sm:min-w-72">
              <MetricItem label={t('common.matches')} value={payload.matchesPlayed} />
              <MetricItem label={t('common.teams')} value={payload.teamCount} />
              <MetricItem label={t('common.courts')} value={payload.courtCount} />
            </MetricGrid>
          </div>

          {payload.awards.length > 0 && (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {payload.awards.slice(0, 3).map((award) => (
                <AwardTile key={award.label} award={award} />
              ))}
            </div>
          )}

          {payload.topTeams.length > 1 && (
            <div className="mt-5 rounded-lg bg-club-surface p-3">
              <p className="text-[0.62rem] font-black uppercase tracking-wide text-club-muted">{t('tournament.runnerUp')}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {payload.topTeams.slice(1, 3).map((team) => (
                  <div key={`${team.rank}-${team.name}`} className="flex min-w-0 items-center gap-2 rounded-lg bg-club-wash px-3 py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-club-surface text-sm font-black text-club-green">#{team.rank}</span>
                    <p className="truncate text-sm font-black text-club-ink">{team.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function AwardTile({ award }) {
  return (
    <div className="rounded-lg bg-club-wash p-3">
      <p className="truncate text-[0.62rem] font-black uppercase tracking-wide text-club-muted">{award.label}</p>
      <p className="mt-1 truncate text-sm font-black text-club-ink">{award.value}</p>
      {award.detail && <p className="mt-1 truncate text-xs font-bold text-club-green">{award.detail}</p>}
    </div>
  );
}

export function TournamentSummaryShareCard({
  title,
  dateLabel,
  formatLabel,
  champion,
  leaderboard,
  teamStats,
  completedMatches,
  pendingMatches,
  tournament,
  showAlert,
}) {
  const { language, t } = useI18n();

  const buildCurrentResultPayload = () =>
    buildResultSharePayload({
      title,
      dateLabel,
      formatLabel,
      champion,
      leaderboard,
      teamStats,
      completedMatches,
      pendingMatches,
      tournament,
      language,
      t,
    });
  const { isSharingResult, isDownloadingPng, shareFeedback, handleShareWhatsApp, handleDownloadResultPng } = useResultSharing({
    buildPayload: buildCurrentResultPayload,
    showAlert,
    t,
  });

  return (
    <ShareResultCard
      title={title}
      dateLabel={dateLabel}
      formatLabel={formatLabel}
      champion={champion}
      leaderboard={leaderboard}
      teamStats={teamStats}
      completedMatches={completedMatches}
      pendingMatches={pendingMatches}
      tournament={tournament}
      isSharing={isSharingResult}
      isDownloading={isDownloadingPng}
      feedback={shareFeedback}
      onShareWhatsApp={handleShareWhatsApp}
      onDownloadPng={handleDownloadResultPng}
      language={language}
      t={t}
    />
  );
}

function RankingRow({ team, rank, stats }) {
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-lg border border-club-border bg-club-soft p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-lg text-sm font-black ${rank === 1 ? 'bg-club-green text-club-greenDeep' : 'bg-club-wash text-club-muted'}`}>{rank}</span>
      <div className="min-w-0">
        <p className="truncate font-black text-club-ink">{getTeamName(team)}</p>
        <p className="mt-0.5 text-xs font-bold text-club-muted">
          {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
          {stats.diff}
        </p>
      </div>
      <p className="text-lg font-black tabular-nums text-club-green">{stats.points}</p>
    </div>
  );
}

function getChampion(tournament, leaderboard) {
  if (tournament.format === 'league') return leaderboard[0] || null;
  const finalMatch = tournament.matches.find((match) => match.matchType === 'final' && match.status === 'completed');
  return finalMatch ? tournament.teams.find((team) => team.id === finalMatch.winnerId) || null : leaderboard[0] || null;
}

function buildResultSharePayload({ title, dateLabel, formatLabel, champion, leaderboard, teamStats, completedMatches, pendingMatches, tournament, language = 'en', t }) {
  const topTeams = leaderboard.slice(0, 3).map((team, index) => {
    const stats = teamStats.get(team.id) || emptyTeamStats();
    return {
      rank: index + 1,
      name: getTeamName(team),
      points: stats.points,
      wins: stats.wins,
      losses: stats.losses,
      diff: stats.diff,
    };
  });
  const playerMovement = buildPlayerMovement(tournament, t);
  const mvpRatingDelta = playerMovement.length ? Math.max(...playerMovement.map((player) => player.ratingDelta)) : 0;
  const mvps = playerMovement.filter((player) => player.ratingDelta === mvpRatingDelta && mvpRatingDelta > 0);
  const biggestRankMove = playerMovement.length ? Math.max(...playerMovement.map((player) => player.rankMovement)) : 0;
  const biggestClimbers = playerMovement.filter((player) => player.rankMovement === biggestRankMove && biggestRankMove > 0);
  const streakBreaker = buildStreakBreakerAward(tournament, t);
  const tightestWin = buildTightestWinAward(tournament, t);
  const championName = champion ? getTeamName(champion) : t('groupHome.pending');
  const awards = buildAwards({
    championName,
    mvps,
    mvpRatingDelta,
    biggestClimbers,
    biggestRankMove,
    streakBreaker,
    tightestWin,
    t,
  });

  return {
    title,
    language,
    dateLabel,
    formatLabel,
    championName,
    topTeams,
    playerMovement,
    mvps,
    mvpNames: mvps.length ? mvps.map((player) => player.name) : [t('tournament.noMvpYet')],
    mvpRatingDelta,
    biggestClimbers,
    biggestRankMove,
    streakBreaker,
    tightestWin,
    awards,
    matchesPlayed: completedMatches.length,
    pendingMatches: pendingMatches.length,
    teamCount: tournament.teams.length,
    courtCount: Math.max(1, Number(tournament.courtCount || 1)),
  };
}

function buildResultShareText(payload, t) {
  const rankingText = payload.topTeams
    .map((team) => `${team.rank}. ${team.name} - ${team.points} ${t('tournament.pointsShort')} (${team.wins}-${team.losses}, ${team.diff > 0 ? '+' : ''}${team.diff})`)
    .join('\n');
  const awardsText = payload.awards
    .map((award) => `${award.label}: ${award.value}${award.detail ? ` (${award.detail})` : ''}`)
    .join('\n');

  return [
    t('tournament.shareTextTitle', { title: payload.title, format: payload.formatLabel }),
    payload.dateLabel,
    t('tournament.shareTextChampion', { champion: payload.championName }),
    awardsText,
    '',
    rankingText,
    '',
    t('tournament.shareTextSummary', {
      matches: payload.matchesPlayed,
      teams: payload.teamCount,
      courts: payload.courtCount,
      plural: payload.courtCount === 1 ? '' : 's',
    }),
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAwards({ championName, mvps, mvpRatingDelta, biggestClimbers, biggestRankMove, streakBreaker, tightestWin, t }) {
  const awards = [{ label: t('tournament.awards.champions'), value: championName, detail: t('tournament.nightWinners') }];

  if (mvps.length) {
    awards.push({
      label: t('tournament.awards.mvp'),
      value: mvps.map((player) => player.name).join(', '),
      detail: `${formatSignedNumber(mvpRatingDelta)} ${t('tournament.ratingPoints')}`,
    });
  }

  if (biggestClimbers.length) {
    awards.push({
      label: t('tournament.awards.mostImproved'),
      value: biggestClimbers.map((player) => player.name).join(', '),
      detail: formatRankMovement(biggestRankMove, t),
    });
  }

  if (streakBreaker) {
    awards.push({
      label: t('tournament.awards.streakBreaker'),
      value: streakBreaker.teamName,
      detail: t('tournament.awards.stoppedRun', { count: streakBreaker.streak }),
    });
  } else if (tightestWin) {
    awards.push({
      label: t('tournament.awards.tightestWin'),
      value: tightestWin.teamName,
      detail: t('tournament.awards.wonBy', { count: tightestWin.margin }),
    });
  }

  return awards.slice(0, 4);
}

function buildStreakBreakerAward(tournament, t) {
  const participantByName = buildParticipantLookup(tournament);
  let bestAward = null;

  (tournament.matches || [])
    .filter((match) => match.status === 'completed' && match.winnerId)
    .forEach((match) => {
      const winnerTeam = (tournament.teams || []).find((team) => team.id === match.winnerId);
      const losingTeams = [match.teamAId, match.teamBId]
        .filter((teamId) => teamId && teamId !== match.winnerId)
        .map((teamId) => (tournament.teams || []).find((team) => team.id === teamId))
        .filter(Boolean);

      losingTeams.forEach((team) => {
        team.players.forEach((playerName) => {
          const participant = participantByName.get(normalizeName(playerName));
          const streak = Number(participant?.currentStreak || 0);
          if (streak >= 2 && (!bestAward || streak > bestAward.streak)) {
            bestAward = {
              teamName: winnerTeam ? getTeamName(winnerTeam) : t('common.winner'),
              brokenPlayerName: playerName,
              streak,
            };
          }
        });
      });
    });

  return bestAward;
}

function buildTightestWinAward(tournament, t) {
  let tightest = null;

  (tournament.matches || [])
    .filter((match) => match.status === 'completed' && match.winnerId)
    .forEach((match) => {
      const scoreA = Number(match.score?.teamA ?? match.scoreA ?? match.teamAScore ?? 0);
      const scoreB = Number(match.score?.teamB ?? match.scoreB ?? match.teamBScore ?? 0);
      if (!scoreA && !scoreB) return;
      const margin = Math.abs(scoreA - scoreB);
      if (margin <= 0) return;
      if (!tightest || margin < tightest.margin) {
        const team = (tournament.teams || []).find((item) => item.id === match.winnerId);
        tightest = {
          teamName: team ? getTeamName(team) : t('common.winner'),
          margin,
        };
      }
    });

  return tightest;
}

function buildParticipantLookup(tournament) {
  const participantMeta = Array.isArray(tournament?.participantMeta) ? tournament.participantMeta : [];
  return new Map(participantMeta.map((participant) => [normalizeName(participant.name), participant]));
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase();
}

function buildPlayerMovement(tournament, t) {
  const participantMeta = Array.isArray(tournament?.participantMeta) ? tournament.participantMeta : [];
  const groupParticipants = participantMeta
    .filter((participant) => participant?.groupPlayerId && participant.source !== 'guest')
    .map((participant) => ({
      id: participant.groupPlayerId,
      name: String(participant.name || t('common.player')),
      previousRating: Math.max(0, Number(participant.rating || 0)),
    }));

  if (!groupParticipants.length) return [];

  const deltas = calculatePlayerMatchDeltas(tournament);
  const deltaByPlayerId = new Map(deltas.map((delta) => [delta.groupPlayerId, Number(delta.ratingDelta || 0)]));
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
  if (movement > 0) return t('tournament.awards.up', { count: movement });
  if (movement < 0) return t('tournament.awards.down', { count: Math.abs(movement) });
  return t('tournament.awards.same');
}

function createResultCardBlob(payload) {
  if (typeof document === 'undefined') return Promise.resolve(null);

  const width = 1080;
  const height = 1920;
  const scale = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);

  ctx.scale(scale, scale);
  drawResultCanvas(ctx, payload, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
  });
}

function drawResultCanvas(ctx, payload, width, height) {
  if (payload.language !== 'ar-EG') {
    drawEnglishResultCanvas(ctx, payload, width, height);
    return;
  }

  ctx.fillStyle = '#B9D94C';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#050607';
  ctx.beginPath();
  ctx.moveTo(0, 580);
  ctx.lineTo(width, 420);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(5, 6, 7, 0.12)';
  ctx.beginPath();
  ctx.arc(width - 120, 170, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050607';
  ctx.font = '900 34px Arial';
  ctx.fillText('الملعب ولّع', 72, 110);

  ctx.fillStyle = 'rgba(5, 6, 7, 0.72)';
  ctx.font = '900 26px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${getArabicFormatLabel(payload.formatLabel)} / ${payload.dateLabel}`, width - 72, 110);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#050607';
  ctx.font = '900 42px Arial';
  ctx.fillText('ملوك الليلة', 72, 250);

  ctx.font = '900 92px Arial';
  drawCanvasText(ctx, payload.championName, 72, 375, width - 144, 104, 2);

  drawCanvasPanel(ctx, 72, 570, width - 144, 112, 32, '#050607', '#050607');
  ctx.fillStyle = '#B9D94C';
  ctx.font = '900 28px Arial';
  drawCanvasText(ctx, payload.title, 112, 635, width - 224, 32, 1);

  const statY = 735;
  const statWidth = 280;
  [
    ['ماتشات', payload.matchesPlayed],
    ['فرق', payload.teamCount],
    ['ملاعب', payload.courtCount],
  ].forEach(([label, value], index) => {
    const x = 72 + index * (statWidth + 48);
    drawCanvasPanel(ctx, x, statY, statWidth, 130, 28, index === 0 ? '#B9D94C' : '#101214', index === 0 ? '#B9D94C' : 'rgba(255,255,255,0.12)');
    ctx.fillStyle = index === 0 ? '#050607' : '#F4F5F2';
    ctx.font = '900 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x + statWidth / 2, statY + 60);
    ctx.fillStyle = index === 0 ? 'rgba(5,6,7,0.68)' : '#989FA6';
    ctx.font = '900 20px Arial';
    ctx.fillText(label, x + statWidth / 2, statY + 100);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#F4F5F2';
  ctx.font = '900 34px Arial';
  ctx.fillText('لقطات الليلة', 72, 975);

  if (payload.awards.length) {
    payload.awards.slice(0, 3).forEach((award, index) => {
      const y = 1035 + index * 160;
      const isMainAward = index === 0;
      drawCanvasPanel(ctx, 72, y, width - 144, 118, 30, isMainAward ? '#B9D94C' : '#101214', isMainAward ? '#B9D94C' : 'rgba(255,255,255,0.12)');
      ctx.fillStyle = isMainAward ? '#050607' : '#B9D94C';
      ctx.font = '900 24px Arial';
      ctx.fillText(getArabicAwardLabel(award.label), 116, y + 42);
      ctx.fillStyle = isMainAward ? '#050607' : '#F4F5F2';
      ctx.font = '900 34px Arial';
      ctx.fillText(trimCanvasText(ctx, award.value, 520), 116, y + 86);
      if (award.detail) {
        ctx.fillStyle = isMainAward ? 'rgba(5,6,7,0.72)' : '#989FA6';
        ctx.font = '900 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(trimCanvasText(ctx, getArabicAwardDetail(award), 260), width - 116, y + 72);
        ctx.textAlign = 'left';
      }
    });
  } else if (payload.mvpRatingDelta > 0) {
    ctx.fillStyle = '#B9D94C';
    ctx.font = '900 34px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatSignedNumber(payload.mvpRatingDelta)} rating pts`, width - 156, 1140);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#989FA6';
    ctx.font = '800 28px Arial';
    drawCanvasText(ctx, 'الجوائز بتظهر بعد نتيجة الجروب.', 72, 1060, width - 144, 34, 2);
  }

  drawCanvasPanel(ctx, 72, 1550, width - 144, 230, 36, '#101214', 'rgba(255,255,255,0.12)');
  ctx.fillStyle = '#B9D94C';
  ctx.font = '900 28px Arial';
  ctx.fillText('قريبين أوي', 116, 1618);

  payload.topTeams.slice(1, 3).forEach((team, index) => {
    const y = 1650 + index * 64;
    ctx.fillStyle = '#B9D94C';
    ctx.font = '900 26px Arial';
    ctx.fillText(`#${team.rank}`, 116, y + 42);
    ctx.fillStyle = '#F4F5F2';
    ctx.font = '900 26px Arial';
    ctx.fillText(trimCanvasText(ctx, team.name, 660), 190, y + 42);
  });

  ctx.fillStyle = '#989FA6';
  ctx.font = '900 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${payload.matchesPlayed} ماتش / ${payload.teamCount} فرق / ${payload.courtCount} ملعب`,
    width / 2,
    1850
  );
  ctx.textAlign = 'left';
}

function drawEnglishResultCanvas(ctx, payload, width, height) {
  ctx.fillStyle = '#B9D94C';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#050607';
  ctx.beginPath();
  ctx.moveTo(0, 580);
  ctx.lineTo(width, 420);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(5, 6, 7, 0.12)';
  ctx.beginPath();
  ctx.arc(width - 120, 170, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050607';
  ctx.font = '900 34px Arial';
  ctx.fillText('PADEL NIGHT', 72, 110);

  ctx.fillStyle = 'rgba(5, 6, 7, 0.72)';
  ctx.font = '900 26px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${payload.formatLabel} / ${payload.dateLabel}`, width - 72, 110);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#050607';
  ctx.font = '900 42px Arial';
  ctx.fillText('CHAMPIONS OF THE NIGHT', 72, 250);

  ctx.font = '900 92px Arial';
  drawCanvasText(ctx, payload.championName, 72, 375, width - 144, 104, 2);

  drawCanvasPanel(ctx, 72, 570, width - 144, 112, 32, '#050607', '#050607');
  ctx.fillStyle = '#B9D94C';
  ctx.font = '900 28px Arial';
  drawCanvasText(ctx, payload.title, 112, 635, width - 224, 32, 1);

  const statY = 735;
  const statWidth = 280;
  [
    ['MATCHES', payload.matchesPlayed],
    ['TEAMS', payload.teamCount],
    ['COURTS', payload.courtCount],
  ].forEach(([label, value], index) => {
    const x = 72 + index * (statWidth + 48);
    drawCanvasPanel(ctx, x, statY, statWidth, 130, 28, index === 0 ? '#B9D94C' : '#101214', index === 0 ? '#B9D94C' : 'rgba(255,255,255,0.12)');
    ctx.fillStyle = index === 0 ? '#050607' : '#F4F5F2';
    ctx.font = '900 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x + statWidth / 2, statY + 60);
    ctx.fillStyle = index === 0 ? 'rgba(5,6,7,0.68)' : '#989FA6';
    ctx.font = '900 20px Arial';
    ctx.fillText(label, x + statWidth / 2, statY + 100);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#F4F5F2';
  ctx.font = '900 34px Arial';
  ctx.fillText('NIGHT HIGHLIGHTS', 72, 975);

  if (payload.awards.length) {
    payload.awards.slice(0, 3).forEach((award, index) => {
      const y = 1035 + index * 160;
      const isMainAward = index === 0;
      drawCanvasPanel(ctx, 72, y, width - 144, 118, 30, isMainAward ? '#B9D94C' : '#101214', isMainAward ? '#B9D94C' : 'rgba(255,255,255,0.12)');
      ctx.fillStyle = isMainAward ? '#050607' : '#B9D94C';
      ctx.font = '900 24px Arial';
      ctx.fillText(award.label.toUpperCase(), 116, y + 42);
      ctx.fillStyle = isMainAward ? '#050607' : '#F4F5F2';
      ctx.font = '900 34px Arial';
      ctx.fillText(trimCanvasText(ctx, award.value, 520), 116, y + 86);
      if (award.detail) {
        ctx.fillStyle = isMainAward ? 'rgba(5,6,7,0.72)' : '#989FA6';
        ctx.font = '900 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(trimCanvasText(ctx, award.detail, 260), width - 116, y + 72);
        ctx.textAlign = 'left';
      }
    });
  } else {
    ctx.fillStyle = '#989FA6';
    ctx.font = '800 28px Arial';
    drawCanvasText(ctx, 'Highlights appear after group results.', 72, 1060, width - 144, 34, 2);
  }

  drawCanvasPanel(ctx, 72, 1550, width - 144, 230, 36, '#101214', 'rgba(255,255,255,0.12)');
  ctx.fillStyle = '#B9D94C';
  ctx.font = '900 28px Arial';
  ctx.fillText('RUNNERS UP', 116, 1618);

  payload.topTeams.slice(1, 3).forEach((team, index) => {
    const y = 1650 + index * 64;
    ctx.fillStyle = '#B9D94C';
    ctx.font = '900 26px Arial';
    ctx.fillText(`#${team.rank}`, 116, y + 42);
    ctx.fillStyle = '#F4F5F2';
    ctx.font = '900 26px Arial';
    ctx.fillText(trimCanvasText(ctx, team.name, 660), 190, y + 42);
  });

  ctx.fillStyle = '#989FA6';
  ctx.font = '900 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${payload.matchesPlayed} matches / ${payload.teamCount} teams / ${payload.courtCount} court${payload.courtCount === 1 ? '' : 's'}`,
    width / 2,
    1850
  );
  ctx.textAlign = 'left';
}

function getArabicFormatLabel(value) {
  return value === 'League' || value === 'دوري' ? 'دوري' : 'كأس';
}

function getArabicAwardLabel(label) {
  const labels = {
    Champions: 'ملوك الليلة',
    MVP: 'نجم القعدة',
    'Most Improved': 'طالع جامد',
    'Streak Breaker': 'بوّظ السلسلة',
    'Tightest Win': 'فوز بالعافية',
  };
  return labels[label] || label;
}

function getArabicAwardDetail(award) {
  const detail = String(award?.detail || '');
  if (award.label === 'Champions') return 'عملوها';
  if (award.label === 'MVP') return detail.replace('rating pts', 'نقطة');
  if (award.label === 'Most Improved') return detail.replace('up ', 'طلع ').replace('down ', 'نزل ');
  if (award.label === 'Streak Breaker') return detail.replace(/^stopped (\d+)-win run$/, 'وقف سلسلة $1');
  if (award.label === 'Tightest Win') return detail.replace(/^won by (\d+)$/, 'فرق $1');
  return detail;
}

function drawCanvasPanel(ctx, x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawCanvasText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let currentLine = '';

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(nextLine).width <= maxWidth) {
      currentLine = nextLine;
      return;
    }
    if (currentLine) lines.push(currentLine);
    currentLine = word;
  });
  if (currentLine) lines.push(currentLine);

  lines.slice(0, maxLines).forEach((line, index) => {
    const isLastVisibleLine = index === maxLines - 1 && lines.length > maxLines;
    ctx.fillText(isLastVisibleLine ? trimCanvasText(ctx, `${line}...`, maxWidth) : line, x, y + index * lineHeight);
  });
}

function trimCanvasText(ctx, text, maxWidth) {
  const value = String(text || '');
  if (ctx.measureText(value).width <= maxWidth) return value;

  let trimmed = value;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}...`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }
  return `${trimmed}...`;
}

function slugify(value) {
  const slug = String(value || 'padel-night')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'padel-night';
}

function downloadBlob(blob, filename) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

function openWhatsAppShare(text) {
  if (typeof window === 'undefined') return;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  const whatsAppWindow = window.open(url, '_blank', 'noopener,noreferrer');
  if (!whatsAppWindow) {
    window.location.href = url;
  }
}
