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

export default function TournamentResultScreen({ tournament, showAlert, onResumeTournament, canManageTournament = false }) {
  const [groupName, setGroupName] = useState('');
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const [isSharingResult, setIsSharingResult] = useState(false);
  const [isDownloadingPng, setIsDownloadingPng] = useState(false);
  const [shareFeedback, setShareFeedback] = useState('');

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
      showAlert('Tournament Reopened', 'You can edit scores and teams again.');
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
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#BEDC45]/14 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#BEDC45]">{statusLabel}</span>
          <span className="rounded-full bg-[#07111B] px-2.5 py-1 text-xs font-black uppercase tracking-wide text-[#8D99A6]">{formatLabel}</span>
          <span className="text-xs font-bold text-[#8D99A6]">{dateLabel}</span>
        </div>
        <h2 className="mt-3 text-2xl font-black leading-tight text-[#F7F8F7] sm:text-3xl">{title}</h2>
        <p className="mt-1 text-sm font-semibold text-[#8D99A6]">
          {completedMatches.length}/{tournament.matches.length} matches completed
        </p>
      </section>

      <section className="grid gap-2 sm:grid-cols-4">
        <ResultStat label="Teams" value={tournament.teams.length} />
        <ResultStat label="Done" value={completedMatches.length} />
        <ResultStat label="Waiting" value={pendingMatches.length} />
        <ResultStat label="Courts" value={Math.max(1, Number(tournament.courtCount || 1))} />
      </section>

      <section className="rounded-3xl border border-[#BEDC45]/30 bg-[#0A141E] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#BEDC45]">
              <TrophyIcon className="h-5 w-5" />
              Result
            </p>
            <h3 className="mt-2 truncate text-2xl font-black text-[#F7F8F7]">{champion ? getTeamName(champion) : 'Result pending'}</h3>
            <p className="mt-1 text-sm font-semibold text-[#8D99A6]">{champion ? 'Top team by the current standings.' : 'No winner is available yet.'}</p>
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

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#8D99A6]">
          <ListIcon className="h-5 w-5 text-[#BEDC45]" />
          Final Ranking
        </h3>
        <div className="space-y-2">
          {leaderboard.map((team, index) => {
            const stats = teamStats.get(team.id) || emptyTeamStats();
            return <RankingRow key={team.id} team={team} rank={index + 1} stats={stats} />;
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-[#8D99A6]">
          <CheckIcon className="h-5 w-5 text-[#BEDC45]" />
          Matches
        </h3>
        <div className="space-y-2">
          {tournament.matches.map((match) => (
            <MatchCard key={match.id} match={match} isCurrent={false} />
          ))}
        </div>
      </section>

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
            <p className="text-sm font-black uppercase tracking-wide text-[#BEDC45]">Tournament Summary PNG</p>
            <h3 className="mt-1 text-2xl font-black text-[#F7F8F7]">Share to WhatsApp</h3>
            <p className="mt-1 max-w-xl text-sm font-semibold text-[#CFD2D3]">
              Includes winner, standings, MVP, player rating points, and rank movement.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[auto_auto]">
            <button
              type="button"
              onClick={onShareWhatsApp}
              disabled={isSharing || isDownloading || completedMatches.length === 0}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-5 font-black text-[#020D16] transition hover:bg-[#41E37D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ShareIcon className="h-5 w-5" />
              {isSharing ? 'Preparing...' : feedback || 'WhatsApp'}
            </button>
            <button
              type="button"
              onClick={onDownloadPng}
              disabled={isSharing || isDownloading || completedMatches.length === 0}
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
              <p className="text-sm font-black uppercase tracking-wide text-[#BEDC45]">Winner</p>
              <h4 className="mt-1 break-words text-3xl font-black leading-tight text-[#F7F8F7]">{payload.championName}</h4>
              <p className="mt-2 text-sm font-bold text-[#8D99A6]">{title}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-72">
              <ResultCardMiniStat label="Matches" value={payload.matchesPlayed} />
              <ResultCardMiniStat label="Teams" value={payload.teamCount} />
              <ResultCardMiniStat label="Courts" value={payload.courtCount} />
            </div>
          </div>

          <div className="mt-5 space-y-2">
            {payload.topTeams.map((team) => (
              <div key={`${team.rank}-${team.name}`} className="grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-2xl bg-[#0A141E] p-3">
                <span className={`grid h-9 w-9 place-items-center rounded-2xl text-sm font-black ${team.rank === 1 ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
                  {team.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-black text-[#F7F8F7]">{team.name}</p>
                  <p className="text-xs font-bold text-[#8D99A6]">
                    {team.wins}-{team.losses} / {team.diff > 0 ? '+' : ''}
                    {team.diff}
                  </p>
                </div>
                <p className="text-lg font-black tabular-nums text-[#BEDC45]">{team.points}</p>
              </div>
            ))}
          </div>

          {payload.playerMovement.length > 0 && (
            <div className="mt-5 rounded-3xl border border-[#1F60D1]/45 bg-[#07111B] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-wide text-[#BEDC45]">MVP</p>
                  <h4 className="mt-1 text-xl font-black text-[#F7F8F7]">{payload.mvpNames.join(', ')}</h4>
                </div>
                <span className="w-fit rounded-full bg-[#1F60D1]/20 px-3 py-1 text-sm font-black text-[#CFD2D3]">
                  {formatSignedNumber(payload.mvpRatingDelta)} pts
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {payload.playerMovement.map((player) => (
                  <div key={player.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-2xl bg-[#0A141E] p-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-[#F7F8F7]">{player.name}</p>
                      <p className="text-xs font-bold text-[#8D99A6]">
                        #{player.previousRank} to #{player.nextRank}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${getMovementPillClass(player.rankMovement)}`}>
                      {formatRankMovement(player.rankMovement)}
                    </span>
                    <span className={`text-sm font-black tabular-nums ${player.ratingDelta >= 0 ? 'text-[#BEDC45]' : 'text-[#DB4145]'}`}>
                      {formatSignedNumber(player.ratingDelta)}
                    </span>
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

function ResultCardMiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-[#0A141E] p-2 text-center">
      <p className="text-xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-0.5 truncate text-[0.58rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
    </div>
  );
}

function ResultStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 text-center">
      <p className="text-2xl font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="mt-1 truncate text-[0.62rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
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

  return {
    title,
    dateLabel,
    formatLabel,
    championName: champion ? getTeamName(champion) : 'Result pending',
    topTeams,
    playerMovement,
    mvps,
    mvpNames: mvps.length ? mvps.map((player) => player.name) : ['No MVP yet'],
    mvpRatingDelta,
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
  const playerMovementText = payload.playerMovement
    .map(
      (player) =>
        `${player.name}: ${formatSignedNumber(player.ratingDelta)} pts, #${player.previousRank} to #${player.nextRank} (${formatRankMovement(player.rankMovement)})`
    )
    .join('\n');

  return [
    `${payload.title} ${payload.formatLabel} result`,
    payload.dateLabel,
    `Winner: ${payload.championName}`,
    payload.playerMovement.length ? `MVP: ${payload.mvpNames.join(', ')} (${formatSignedNumber(payload.mvpRatingDelta)} pts)` : '',
    '',
    rankingText,
    payload.playerMovement.length ? '\nPlayer movement' : '',
    playerMovementText,
    '',
    `${payload.matchesPlayed} matches played, ${payload.teamCount} teams, ${payload.courtCount} court${payload.courtCount === 1 ? '' : 's'}.`,
  ]
    .filter(Boolean)
    .join('\n');
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

function getMovementPillClass(value) {
  const movement = Number(value || 0);
  if (movement > 0) return 'bg-[#BEDC45] text-[#020D16]';
  if (movement < 0) return 'bg-[#DB4145]/15 text-[#DB4145]';
  return 'bg-[#07111B] text-[#8D99A6]';
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
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#020D16');
  gradient.addColorStop(0.42, '#0A141E');
  gradient.addColorStop(1, '#12202B');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(190, 220, 69, 0.1)';
  ctx.beginPath();
  ctx.arc(width - 120, 150, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(31, 96, 209, 0.14)';
  ctx.beginPath();
  ctx.arc(90, height - 140, 260, 0, Math.PI * 2);
  ctx.fill();

  drawCanvasPanel(ctx, 64, 64, width - 128, height - 128, 44, 'rgba(10, 20, 30, 0.88)', '#BEDC45');

  ctx.fillStyle = '#BEDC45';
  ctx.font = '900 32px Arial';
  ctx.fillText('PADEL NIGHT RESULT', 108, 150);

  ctx.fillStyle = '#8D99A6';
  ctx.font = '800 28px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`${payload.formatLabel} - ${payload.dateLabel}`, width - 108, 150);
  ctx.textAlign = 'left';

  drawCanvasPanel(ctx, 108, 220, width - 216, 430, 38, '#020D16', '#BEDC45');
  ctx.fillStyle = '#BEDC45';
  ctx.font = '900 30px Arial';
  ctx.fillText('WINNER', 156, 310);

  ctx.fillStyle = '#F7F8F7';
  ctx.font = '900 72px Arial';
  drawCanvasText(ctx, payload.championName, 156, 425, width - 312, 80, 2);

  ctx.fillStyle = '#8D99A6';
  ctx.font = '800 30px Arial';
  drawCanvasText(ctx, payload.title, 156, 585, width - 312, 36, 1);

  const statY = 720;
  const statWidth = 260;
  const statGap = 42;
  [
    ['MATCHES', payload.matchesPlayed],
    ['TEAMS', payload.teamCount],
    ['COURTS', payload.courtCount],
  ].forEach(([label, value], index) => {
    const x = 108 + index * (statWidth + statGap);
    drawCanvasPanel(ctx, x, statY, statWidth, 150, 26, '#07111B', index === 0 ? '#BEDC45' : 'rgba(255,255,255,0.08)');
    ctx.fillStyle = '#F7F8F7';
    ctx.font = '900 52px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(String(value), x + statWidth / 2, statY + 70);
    ctx.fillStyle = '#8D99A6';
    ctx.font = '800 22px Arial';
    ctx.fillText(label, x + statWidth / 2, statY + 112);
    ctx.textAlign = 'left';
  });

  drawCanvasPanel(ctx, 108, 950, width - 216, 420, 32, '#07111B', '#1F60D1');
  ctx.fillStyle = '#BEDC45';
  ctx.font = '900 30px Arial';
  ctx.fillText('FINAL TOP 3', 148, 1020);

  payload.topTeams.forEach((team, index) => {
    const y = 1060 + index * 94;
    drawCanvasPanel(ctx, 148, y, width - 296, 74, 24, index === 0 ? '#19232B' : '#0A141E', index === 0 ? '#BEDC45' : 'rgba(255,255,255,0.08)');

    ctx.fillStyle = index === 0 ? '#BEDC45' : '#8D99A6';
    ctx.font = '900 34px Arial';
    ctx.fillText(`#${team.rank}`, 188, y + 49);

    ctx.fillStyle = '#F7F8F7';
    ctx.font = '900 30px Arial';
    ctx.fillText(trimCanvasText(ctx, team.name, 500), 270, y + 49);

    ctx.fillStyle = '#BEDC45';
    ctx.font = '900 30px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${team.points} pts`, width - 188, y + 49);
    ctx.textAlign = 'left';
  });

  const mvpTop = 1480;
  drawCanvasPanel(ctx, 108, mvpTop, width - 216, 300, 38, '#020D16', '#BEDC45');

  ctx.fillStyle = '#BEDC45';
  ctx.font = '900 30px Arial';
  ctx.fillText(payload.mvpNames.length > 1 ? 'MVPS OF THE NIGHT' : 'MVP OF THE NIGHT', 156, mvpTop + 70);

  ctx.fillStyle = '#F7F8F7';
  ctx.font = '900 48px Arial';
  drawCanvasText(ctx, payload.mvpNames.join(', '), 156, mvpTop + 150, width - 312, 56, 2);

  if (payload.mvpRatingDelta > 0) {
    ctx.fillStyle = '#BEDC45';
    ctx.font = '900 34px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${formatSignedNumber(payload.mvpRatingDelta)} rating pts`, width - 156, mvpTop + 256);
    ctx.textAlign = 'left';
  } else {
    ctx.fillStyle = '#8D99A6';
    ctx.font = '800 28px Arial';
    drawCanvasText(ctx, 'Player movement appears when group player ratings are available.', 156, mvpTop + 244, width - 312, 34, 2);
  }
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
