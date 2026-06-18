import React, { useEffect, useMemo, useState } from 'react';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import { CheckIcon, ListIcon, ShareIcon, TrophyIcon } from '../components/Icons';
import { fetchGroups } from '../utils/groupService';
import { calculatePlayerMatchDeltas } from '../utils/playerProgressionService';
import { reopenTournamentRecord } from '../utils/tournamentService';
import { buildLeaderboard, emptyTeamStats } from '../utils/tournamentRules';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const getTeamName = (team) => team.players.join(' & ');

export default function TournamentResultScreen({ tournament, showAlert, showToast, onResumeTournament, canManageTournament = false }) {
  const [groupName, setGroupName] = useState('');
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');
  const [showStandings, setShowStandings] = useState(false);
  const [showMatches, setShowMatches] = useState(false);

  const { leaderboard, teamStats } = useMemo(() => buildLeaderboard(tournament), [tournament]);
  const completedMatches = useMemo(() => tournament.matches.filter((match) => match.status === 'completed'), [tournament.matches]);
  const pendingMatches = useMemo(() => tournament.matches.filter((match) => match.status !== 'completed'), [tournament.matches]);
  const isEnded = tournament.status === 'ended';
  const isComplete = tournament.matches.length > 0 && completedMatches.length === tournament.matches.length;
  const formatLabel = tournament.format === 'league' ? 'League' : 'Cup';
  const title = groupName || (tournament.groupId ? 'Group night' : `Quick ${formatLabel} night`);
  const dateLabel = formatDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt);
  const statusLabel = isEnded ? 'Ended' : isComplete ? 'Complete' : 'Live';
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
        showToast('Tournament reopened', 'Scores and teams can be edited.', 'success');
      } else {
        showAlert('Tournament Reopened', 'Scores and teams can be edited.');
      }
    } catch (error) {
      console.error('Error reopening tournament:', error);
      showAlert('Error', 'Could not reopen tournament.');
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
    });

  const handleShareWhatsApp = async () => {
    const payload = buildCurrentResultPayload();
    const shareText = buildResultShareText(payload);

    try {
      setIsSharingResult(true);
      setShareFeedback('');

      const imageBlob = await createResultCardBlob(payload);
      const file = imageBlob && typeof File !== 'undefined'
        ? new File([imageBlob], `${slugify(payload.title)}-tournament-summary.png`, { type: 'image/png' })
        : null;

      if (file && navigator.canShare?.({ files: [file], title: `${payload.title} tournament summary`, text: shareText })) {
        await navigator.share({ files: [file], title: `${payload.title} tournament summary`, text: shareText });
        setShareFeedback('Shared');
        return;
      }

      if (imageBlob) {
        downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      }
      openWhatsAppShare(shareText);
      setShareFeedback(imageBlob ? 'PNG downloaded' : 'WhatsApp opened');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing WhatsApp summary:', error);
        showAlert('WhatsApp Share Failed', 'Could not prepare the tournament summary for WhatsApp.');
      }
    } finally {
      setIsSharingResult(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

  const handleDownloadResultPng = async () => {
    const payload = buildCurrentResultPayload();

    try {
      setIsDownloadingPng(true);
      const imageBlob = await createResultCardBlob(payload);
      if (!imageBlob) {
        showAlert('Download Unavailable', 'Your browser could not generate the tournament summary image.');
        return;
      }
      downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      setShareFeedback('PNG downloaded');
    } catch (error) {
      console.error('Error downloading tournament summary:', error);
      showAlert('Download Failed', 'Could not download the tournament summary image.');
    } finally {
      setIsDownloadingPng(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 pb-24 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6 sm:pb-6">
      <section className="rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] p-4 shadow-lg shadow-[#020D16]/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">{statusLabel}</span>
              <span className="rounded-full bg-[#07111B] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{formatLabel}</span>
              <span className="text-xs font-bold text-[#8D99A6]">{dateLabel}</span>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#BEDC45]">
              <TrophyIcon className="h-5 w-5" />
              Champions
            </p>
            <h2 className="mt-2 break-words text-3xl font-black leading-tight text-[#F7F8F7] sm:text-4xl">{champion ? getTeamName(champion) : 'Pending'}</h2>
            <p className="mt-2 text-sm font-semibold text-[#8D99A6]">{title}</p>
          </div>
          {!isEnded ? (
            <button
              type="button"
              onClick={() => onResumeTournament(tournament)}
              className="min-h-11 shrink-0 rounded-2xl bg-[#BEDC45] px-4 text-sm font-black text-[#020D16] transition hover:bg-[#D3F05A]"
            >
              Resume
            </button>
          ) : canManageTournament ? (
            <button
              type="button"
              onClick={() => setShowReopenConfirm(true)}
              disabled={isReopening}
              className="min-h-11 shrink-0 rounded-2xl bg-[#BEDC45] px-4 text-sm font-black text-[#020D16] transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reopen
            </button>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-4 divide-x divide-[rgba(255,255,255,0.08)] rounded-2xl bg-[#07111B] px-2 py-2">
          <ResultMini label="Teams" value={tournament.teams.length} />
          <ResultMini label="Done" value={completedMatches.length} />
          <ResultMini label="Waiting" value={pendingMatches.length} />
          <ResultMini label="Courts" value={Math.max(1, Number(tournament.courtCount || 1))} />
        </div>
      </section>

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
      />

      <DetailSection
        icon={<ListIcon className="h-5 w-5 text-[#BEDC45]" />}
        title="Final Ranking"
        count={leaderboard.length}
        open={showStandings}
        onToggle={() => setShowStandings((current) => !current)}
      >
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const stats = teamStats.get(team.id) || emptyTeamStats();
            return <RankingRow key={team.id} team={team} rank={index + 1} stats={stats} />;
          })}
        </div>
      </DetailSection>

      <DetailSection
        icon={<CheckIcon className="h-5 w-5 text-[#BEDC45]" />}
        title="Matches"
        count={tournament.matches.length}
        open={showMatches}
        onToggle={() => setShowMatches((current) => !current)}
      >
        <div className="space-y-2">
          {tournament.matches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}
        </div>
      </DetailSection>

      {showReopenConfirm && (
        <ConfirmationModal
          title="Reopen Tournament?"
          message="This opens the live tournament screen and makes editing available again."
          onConfirm={confirmReopenTournament}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}
    </div>
  );
}

function ResultMini({ label, value }) {
  return (
    <div className="px-2 text-center">
      <p className="text-lg font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-0.5 truncate text-[0.56rem] font-black uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function DetailSection({ icon, title, count, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3">
      <button type="button" onClick={onToggle} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-1 text-left">
        <span className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="truncate text-sm font-black uppercase tracking-wide text-[#F7F8F7]">{title}</span>
        </span>
        <span className="shrink-0 rounded-full bg-[#07111B] px-3 py-1 text-xs font-black tabular-nums text-[#BEDC45]">
          {open ? 'Hide' : count}
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </section>
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
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-[#1F60D1]/60 bg-[#0A141E] shadow-lg shadow-[#020D16]/20">
      <div className="bg-[#1F60D1]/16 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-[#BEDC45]">Social Brag</p>
            <h3 className="mt-1 text-2xl font-black text-[#F7F8F7]">Share the Night</h3>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_auto]">
            <button
              type="button"
              onClick={onShareWhatsApp}
              disabled={isSharing || isDownloading}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 font-black text-[#020D16] transition hover:bg-[#41E37D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShareIcon className="h-5 w-5" />
              {isSharing ? 'Preparing...' : feedback || 'WhatsApp PNG'}
            </button>
            <button
              type="button"
              onClick={onDownloadPng}
              disabled={isSharing || isDownloading}
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-5 font-black text-[#F7F8F7] transition hover:bg-[#0D1823] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isDownloading ? 'Preparing...' : 'Download PNG'}
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="rounded-3xl border border-[#BEDC45]/30 bg-[#020D16] p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#BEDC45] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#020D16]">Padel Night</span>
            <span className="rounded-full bg-[#0A141E] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{formatLabel}</span>
            <span className="text-xs font-bold text-[#8D99A6]">{dateLabel}</span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="min-w-0">
              <p className="text-sm font-black uppercase tracking-wide text-[#BEDC45]">Champions of the Night</p>
              <h4 className="mt-1 break-words text-3xl font-black leading-tight text-[#F7F8F7]">{payload.championName}</h4>
              <p className="mt-2 text-sm font-bold text-[#8D99A6]">{title}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-72">
              <ResultCardMiniStat label="Matches" value={payload.matchesPlayed} />
              <ResultCardMiniStat label="Teams" value={payload.teamCount} />
              <ResultCardMiniStat label="Courts" value={payload.courtCount} />
            </div>
          </div>

          {payload.awards.length > 0 && (
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              {payload.awards.slice(0, 3).map((award) => (
                <AwardTile key={award.label} award={award} />
              ))}
            </div>
          )}

          {payload.topTeams.length > 1 && (
            <div className="mt-5 rounded-2xl bg-[#0A141E] p-3">
              <p className="text-[0.62rem] font-black uppercase tracking-wide text-[#8D99A6]">Runner Up</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {payload.topTeams.slice(1, 3).map((team) => (
                  <div key={`${team.rank}-${team.name}`} className="flex min-w-0 items-center gap-2 rounded-2xl bg-[#07111B] px-3 py-2">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[#0A141E] text-sm font-black text-[#BEDC45]">#{team.rank}</span>
                    <p className="truncate text-sm font-black text-[#F7F8F7]">{team.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function AwardTile({ award }) {
  return (
    <div className="rounded-2xl bg-[#07111B] p-3">
      <p className="truncate text-[0.62rem] font-black uppercase tracking-wide text-[#8D99A6]">{award.label}</p>
      <p className="mt-1 truncate text-sm font-black text-[#F7F8F7]">{award.value}</p>
      {award.detail && <p className="mt-1 truncate text-xs font-bold text-[#BEDC45]">{award.detail}</p>}
    </div>
  );
}

function ResultCardMiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#0A141E] p-2 text-center">
      <p className="text-xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-0.5 truncate text-[0.58rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
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
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

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
    });

  const handleShareWhatsApp = async () => {
    const payload = buildCurrentResultPayload();
    const shareText = buildResultShareText(payload);

    try {
      setIsSharingResult(true);
      setShareFeedback('');

      const imageBlob = await createResultCardBlob(payload);
      const file = imageBlob && typeof File !== 'undefined'
        ? new File([imageBlob], `${slugify(payload.title)}-tournament-summary.png`, { type: 'image/png' })
        : null;

      if (file && navigator.canShare?.({ files: [file], title: `${payload.title} tournament summary`, text: shareText })) {
        await navigator.share({ files: [file], title: `${payload.title} tournament summary`, text: shareText });
        setShareFeedback('Shared');
        return;
      }

      if (imageBlob) {
        downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      }
      openWhatsAppShare(shareText);
      setShareFeedback(imageBlob ? 'PNG downloaded' : 'WhatsApp opened');
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('Error sharing WhatsApp summary:', error);
        showAlert('WhatsApp Share Failed', 'Could not prepare the tournament summary for WhatsApp.');
      }
    } finally {
      setIsSharingResult(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

  const handleDownloadResultPng = async () => {
    const payload = buildCurrentResultPayload();

    try {
      setIsDownloadingPng(true);
      const imageBlob = await createResultCardBlob(payload);
      if (!imageBlob) {
        showAlert('Download Unavailable', 'Your browser could not generate the tournament summary image.');
        return;
      }
      downloadBlob(imageBlob, `${slugify(payload.title)}-tournament-summary.png`);
      setShareFeedback('PNG downloaded');
    } catch (error) {
      console.error('Error downloading tournament summary:', error);
      showAlert('Download Failed', 'Could not download the tournament summary image.');
    } finally {
      setIsDownloadingPng(false);
      setTimeout(() => setShareFeedback(''), 2200);
    }
  };

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
    />
  );
}

function RankingRow({ team, rank, stats }) {
  return (
    <div className="grid grid-cols-[40px_1fr_auto] items-center gap-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] p-3">
      <span className={`grid h-10 w-10 place-items-center rounded-2xl text-sm font-black ${rank === 1 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{rank}</span>
      <div className="min-w-0">
        <p className="truncate font-black text-[#F7F8F7]">{getTeamName(team)}</p>
        <p className="mt-0.5 text-xs font-bold text-[#8D99A6]">
          {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
          {stats.diff}
        </p>
      </div>
      <p className="text-lg font-black tabular-nums text-[#BEDC45]">{stats.points}</p>
    </div>
  );
}

function getChampion(tournament, leaderboard) {
  if (tournament.format === 'league') return leaderboard[0] || null;
  const finalMatch = tournament.matches.find((match) => match.matchType === 'final' && match.status === 'completed');
  return finalMatch ? tournament.teams.find((team) => team.id === finalMatch.winnerId) || null : leaderboard[0] || null;
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'No date';
}

function buildResultSharePayload({ title, dateLabel, formatLabel, champion, leaderboard, teamStats, completedMatches, pendingMatches, tournament }) {
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
  const playerMovement = buildPlayerMovement(tournament);
  const mvpRatingDelta = playerMovement.length ? Math.max(...playerMovement.map((player) => player.ratingDelta)) : 0;
  const mvps = playerMovement.filter((player) => player.ratingDelta === mvpRatingDelta && mvpRatingDelta > 0);
  const biggestRankMove = playerMovement.length ? Math.max(...playerMovement.map((player) => player.rankMovement)) : 0;
  const biggestClimbers = playerMovement.filter((player) => player.rankMovement === biggestRankMove && biggestRankMove > 0);
  const streakBreaker = buildStreakBreakerAward(tournament);
  const tightestWin = buildTightestWinAward(tournament);
  const awards = buildAwards({
    championName: champion ? getTeamName(champion) : 'Pending',
    mvps,
    mvpRatingDelta,
    biggestClimbers,
    biggestRankMove,
    streakBreaker,
    tightestWin,
  });

  return {
    title,
    dateLabel,
    formatLabel,
    championName: champion ? getTeamName(champion) : 'Pending',
    topTeams,
    playerMovement,
    mvps,
    mvpNames: mvps.length ? mvps.map((player) => player.name) : ['No MVP yet'],
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

function buildResultShareText(payload) {
  const rankingText = payload.topTeams
    .map((team) => `${team.rank}. ${team.name} - ${team.points} pts (${team.wins}-${team.losses}, ${team.diff > 0 ? '+' : ''}${team.diff})`)
    .join('\n');
  const awardsText = payload.awards
    .map((award) => `${award.label}: ${award.value}${award.detail ? ` (${award.detail})` : ''}`)
    .join('\n');

  return [
    `${payload.title} ${payload.formatLabel} night`,
    payload.dateLabel,
    `Champions: ${payload.championName}`,
    awardsText,
    '',
    rankingText,
    '',
    `${payload.matchesPlayed} matches played, ${payload.teamCount} teams, ${payload.courtCount} court${payload.courtCount === 1 ? '' : 's'}.`,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildAwards({ championName, mvps, mvpRatingDelta, biggestClimbers, biggestRankMove, streakBreaker, tightestWin }) {
  const awards = [{ label: 'Champions', value: championName, detail: 'night winners' }];

  if (mvps.length) {
    awards.push({
      label: 'MVP',
      value: mvps.map((player) => player.name).join(', '),
      detail: `${formatSignedNumber(mvpRatingDelta)} rating pts`,
    });
  }

  if (biggestClimbers.length) {
    awards.push({
      label: 'Most Improved',
      value: biggestClimbers.map((player) => player.name).join(', '),
      detail: formatRankMovement(biggestRankMove),
    });
  }

  if (streakBreaker) {
    awards.push({
      label: 'Streak Breaker',
      value: streakBreaker.teamName,
      detail: `stopped ${streakBreaker.streak}-win run`,
    });
  } else if (tightestWin) {
    awards.push({
      label: 'Tightest Win',
      value: tightestWin.teamName,
      detail: `won by ${tightestWin.margin}`,
    });
  }

  return awards.slice(0, 4);
}

function buildStreakBreakerAward(tournament) {
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
              teamName: winnerTeam ? getTeamName(winnerTeam) : 'Winning team',
              brokenPlayerName: playerName,
              streak,
            };
          }
        });
      });
    });

  return bestAward;
}

function buildTightestWinAward(tournament) {
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
          teamName: team ? getTeamName(team) : 'Winning team',
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

function formatRankMovement(value) {
  const movement = Number(value || 0);
  if (movement > 0) return `up ${movement}`;
  if (movement < 0) return `down ${Math.abs(movement)}`;
  return 'same';
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
  ctx.fillStyle = '#BEDC45';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#020D16';
  ctx.beginPath();
  ctx.moveTo(0, 580);
  ctx.lineTo(width, 420);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(2, 13, 22, 0.12)';
  ctx.beginPath();
  ctx.arc(width - 120, 170, 300, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#020D16';
  ctx.font = '900 34px Arial';
  ctx.fillText('الملعب ولّع', 72, 110);

  ctx.fillStyle = 'rgba(2, 13, 22, 0.72)';
  ctx.font = '900 26px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${getArabicFormatLabel(payload.formatLabel)} / ${payload.dateLabel}`, width - 72, 110);
  ctx.textAlign = 'left';

  ctx.fillStyle = '#020D16';
  ctx.font = '900 42px Arial';
  ctx.fillText('ملوك الليلة', 72, 250);

  ctx.font = '900 92px Arial';
  drawCanvasText(ctx, payload.championName, 72, 375, width - 144, 104, 2);

  drawCanvasPanel(ctx, 72, 570, width - 144, 112, 32, '#020D16', '#020D16');
  ctx.fillStyle = '#BEDC45';
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
    drawCanvasPanel(ctx, x, statY, statWidth, 130, 28, index === 0 ? '#BEDC45' : '#0A141E', index === 0 ? '#BEDC45' : 'rgba(255,255,255,0.12)');
    ctx.fillStyle = index === 0 ? '#020D16' : '#F7F8F7';
    ctx.font = '900 50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x + statWidth / 2, statY + 60);
    ctx.fillStyle = index === 0 ? 'rgba(2,13,22,0.68)' : '#8D99A6';
    ctx.font = '900 20px Arial';
    ctx.fillText(label, x + statWidth / 2, statY + 100);
    ctx.textAlign = 'left';
  });

  ctx.fillStyle = '#F7F8F7';
  ctx.font = '900 34px Arial';
  ctx.fillText('لقطات الليلة', 72, 975);

  if (payload.awards.length) {
    payload.awards.slice(0, 3).forEach((award, index) => {
      const y = 1035 + index * 160;
      const isMainAward = index === 0;
      drawCanvasPanel(ctx, 72, y, width - 144, 118, 30, isMainAward ? '#BEDC45' : '#0A141E', isMainAward ? '#BEDC45' : 'rgba(255,255,255,0.12)');
      ctx.fillStyle = isMainAward ? '#020D16' : '#BEDC45';
      ctx.font = '900 24px Arial';
      ctx.fillText(getArabicAwardLabel(award.label), 116, y + 42);
      ctx.fillStyle = isMainAward ? '#020D16' : '#F7F8F7';
      ctx.font = '900 34px Arial';
      ctx.fillText(trimCanvasText(ctx, award.value, 520), 116, y + 86);
      if (award.detail) {
        ctx.fillStyle = isMainAward ? 'rgba(2,13,22,0.72)' : '#8D99A6';
        ctx.font = '900 24px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(trimCanvasText(ctx, getArabicAwardDetail(award), 260), width - 116, y + 72);
        ctx.textAlign = 'left';
      }
    });
  } else if (payload.mvpRatingDelta > 0) {
    ctx.fillStyle = '#BEDC45';
    ctx.font = '900 34px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatSignedNumber(payload.mvpRatingDelta)} rating pts`, width - 156, 1140);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#8D99A6';
    ctx.font = '800 28px Arial';
    drawCanvasText(ctx, 'الجوائز بتظهر بعد نتيجة الجروب.', 72, 1060, width - 144, 34, 2);
  }

  drawCanvasPanel(ctx, 72, 1550, width - 144, 230, 36, '#07111B', 'rgba(255,255,255,0.12)');
  ctx.fillStyle = '#BEDC45';
  ctx.font = '900 28px Arial';
  ctx.fillText('قريبين أوي', 116, 1618);

  payload.topTeams.slice(1, 3).forEach((team, index) => {
    const y = 1650 + index * 64;
    ctx.fillStyle = '#BEDC45';
    ctx.font = '900 26px Arial';
    ctx.fillText(`#${team.rank}`, 116, y + 42);
    ctx.fillStyle = '#F7F8F7';
    ctx.font = '900 26px Arial';
    ctx.fillText(trimCanvasText(ctx, team.name, 660), 190, y + 42);
  });

  ctx.fillStyle = '#8D99A6';
  ctx.font = '900 22px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${payload.matchesPlayed} ماتش / ${payload.teamCount} فرق / ${payload.courtCount} ملعب`,
    width / 2,
    1850
  );
  ctx.textAlign = 'left';
}

function getArabicFormatLabel(value) {
  return value === 'League' ? 'دوري' : 'كأس';
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
