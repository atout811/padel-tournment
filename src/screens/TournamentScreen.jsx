import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { endTournamentRecord, reopenTournamentRecord, updateTournamentRecord } from '../utils/tournamentService';
import { distributeMatchesFairly } from '../utils/scheduling';
import { applyGroupSessionStats } from '../utils/playerProgressionService';
import CurrentMatchCard from '../components/CurrentMatchCard';
import MatchCard from '../components/MatchCard';
import { ConfirmationModal } from '../components/Alert';
import EditTeamsModal from '../screens/modals/EditTeamsModal';
import GameHistoryModal from '../screens/modals/GameHistoryModal';
import { TournamentSummaryShareCard } from './TournamentResultScreen.jsx';
import { buildCourtAssignments, buildLeaderboard, emptyTeamStats, promoteMatchToActiveCourt, reconcileTournamentCourts, syncTeamPointsFromMatches } from '../utils/tournamentRules';
import { CheckIcon, CourtIcon, ShareIcon, TrashIcon, TrophyIcon, UsersIcon } from '../components/Icons';
import { BottomActionBar, Button, EmptyState, Panel, Pill, ScreenShell, SectionHeading } from '../components/Ui.jsx';
import { useI18n } from '../i18n/useI18n.js';

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const getTeamName = (team) => team.players.join(' & ');

export default function TournamentScreen({ tournament, setTournament, showAlert, showToast, setScreen, shareLink, onTournamentEnded, canManageTournament = true, isReadOnly = false }) {
  const { t } = useI18n();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);
  const [showEditTeams, setShowEditTeams] = useState(false);
  const [showGameHistory, setShowGameHistory] = useState(false);
  const [isCopyingLink, setIsCopyingLink] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState('');
  const [activePanel, setActivePanel] = useState('standings');
  const [isSavingResult, setIsSavingResult] = useState(false);
  const isSavingResultRef = useRef(false);
  const statsApplyAttemptedRef = useRef(null);

  const { leaderboard, teamStats } = useMemo(() => buildLeaderboard(tournament), [tournament]);
  const currentRoundMatches = useMemo(() => tournament.matches.filter((match) => match.round === tournament.currentRound), [tournament.matches, tournament.currentRound]);
  const pendingMatches = useMemo(() => currentRoundMatches.filter((match) => match.status === 'pending'), [currentRoundMatches]);
  const completedMatches = useMemo(() => tournament.matches.filter((match) => match.status === 'completed'), [tournament.matches]);
  const remainingMatches = useMemo(() => tournament.matches.filter((match) => match.status !== 'completed'), [tournament.matches]);
  const courtCount = useMemo(() => Math.max(1, Math.min(Number(tournament.courtCount || 1), 3)), [tournament.courtCount]);
  const pendingMatchMap = useMemo(() => new Map(pendingMatches.map((match) => [match.id, match])), [pendingMatches]);
  const resolvedCourtAssignments = useMemo(
    () =>
      buildCourtAssignments({
        pendingMatches,
        courtCount,
        preferredMatchId: tournament.currentMatchId,
        courtAssignments: tournament.courtAssignments,
      }),
    [courtCount, pendingMatches, tournament.courtAssignments, tournament.currentMatchId]
  );
  const activeMatchIds = useMemo(() => new Set(resolvedCourtAssignments.filter(Boolean)), [resolvedCourtAssignments]);
  const activeMatches = useMemo(() => resolvedCourtAssignments.map((matchId) => pendingMatchMap.get(matchId)).filter(Boolean), [pendingMatchMap, resolvedCourtAssignments]);
  const courtSlots = useMemo(() => resolvedCourtAssignments.map((matchId) => pendingMatchMap.get(matchId) || null), [pendingMatchMap, resolvedCourtAssignments]);
  const upcomingMatches = useMemo(() => {
    return distributeMatchesFairly(pendingMatches.filter((match) => !activeMatchIds.has(match.id)));
  }, [activeMatchIds, pendingMatches]);
  const waitingMatchesCount = upcomingMatches.length;

  const finalMatch = useMemo(() => tournament.matches.find((match) => match.matchType === 'final' && match.status === 'completed'), [tournament.matches]);
  const round2LeagueMatches = useMemo(() => tournament.matches.filter((match) => match.round === 2), [tournament.matches]);
  const isTournamentFinished =
    tournament.format === 'league'
      ? round2LeagueMatches.length > 0 && round2LeagueMatches.every((match) => match.status === 'completed')
      : Boolean(finalMatch);
  const hasSharedWriteAccess = Boolean(tournament.scoreToken);
  const canUpdateScores = (canManageTournament || hasSharedWriteAccess) && !isReadOnly;
  const canEditTeams = canManageTournament && !isReadOnly;
  const canEndTournament = canManageTournament;
  const canReopenTournament = canManageTournament && isReadOnly;
  const champion =
    tournament.format === 'league'
      ? leaderboard[0]
      : finalMatch
        ? tournament.teams.find((team) => team.id === finalMatch.winnerId)
        : null;
  const resultFormatLabel = tournament.format === 'league' ? 'League' : 'Cup';
  const resultTitle = tournament.groupId ? 'Group night' : `Quick ${resultFormatLabel} night`;
  const resultDateLabel = formatDate(tournament.endedAt || tournament.createdAt || tournament.updatedAt);

  const completedInRound = currentRoundMatches.filter((match) => match.status === 'completed').length;
  const roundProgress = currentRoundMatches.length ? Math.round((completedInRound / currentRoundMatches.length) * 100) : 0;

  useEffect(() => {
    statsApplyAttemptedRef.current = null;
  }, [tournament.groupSessionId]);

  const handleCopyShareLink = async () => {
    if (!shareLink) return;
    if (!navigator?.clipboard?.writeText) {
      showAlert(t('tournament.copyUnavailableTitle'), t('tournament.copyUnavailableMessage'));
      return;
    }

    try {
      setIsCopyingLink(true);
      await navigator.clipboard.writeText(shareLink);
      setCopyFeedback(t('tournament.copied'));
      setTimeout(() => setCopyFeedback(''), 2000);
    } catch (error) {
      console.error('Failed to copy share link:', error);
      setCopyFeedback('');
      showAlert(t('tournament.copyFailedTitle'), t('tournament.copyFailedMessage'));
    } finally {
      setIsCopyingLink(false);
    }
  };

  useEffect(() => {
    setCopyFeedback('');
    setIsCopyingLink(false);
  }, [shareLink]);

  useEffect(() => {
    const groupId = tournament?.groupId;
    const sessionId = tournament?.groupSessionId;
    if (!isTournamentFinished || !groupId || !sessionId || statsApplyAttemptedRef.current === sessionId) {
      return undefined;
    }

    let active = true;
    statsApplyAttemptedRef.current = sessionId;

    applyGroupSessionStats({ groupId, sessionId, tournamentData: tournament })
      .then((result) => {
        if (!active) return;
        if (result.status === 'applied') {
          if (result.updatedPlayers) {
            showToast?.(t('tournament.statsUpdated'), t('tournament.statsUpdatedDetail', { count: result.updatedPlayers, plural: result.updatedPlayers === 1 ? '' : 's' }), 'success');
          }
          return;
        }
        if (result.status === 'already_applied') {
          showToast?.(t('tournament.statsAlreadyApplied'), '', 'info');
        }
      })
      .catch((error) => {
        console.error('Error applying player stats:', error);
        if (active) {
          showToast?.(t('tournament.statsNotUpdated'), t('tournament.statsNotUpdatedDetail'), 'danger');
        }
      });

    return () => {
      active = false;
    };
  }, [isTournamentFinished, showToast, t, tournament]);

  const handleDeclareWinner = async (match, result) => {
    if (isReadOnly) {
      showAlert(t('tournament.closedTitle'), t('tournament.closedResults'));
      return;
    }

    if (!canUpdateScores) {
      showAlert(t('tournament.sharedAccessRequiredTitle'), t('tournament.sharedAccessRequiredMessage'));
      return;
    }

    const winnerId = typeof result === 'string' ? result : result?.winnerId;
    if (!winnerId) {
      showAlert(t('tournament.winnerRequiredTitle'), t('tournament.winnerRequiredMessage'));
      return;
    }

    if (isSavingResultRef.current) {
      showAlert(t('tournament.saveInProgressTitle'), t('tournament.saveInProgressMessage'));
      return;
    }

    let updatedTournament = JSON.parse(JSON.stringify(tournament));
    updatedTournament.courtAssignments = [...resolvedCourtAssignments];
    const matchIndex = updatedTournament.matches.findIndex((item) => item.id === match.id);
    if (matchIndex === -1) {
      showAlert(t('alerts.error'), t('tournament.saveError'));
      return;
    }

    isSavingResultRef.current = true;
    setIsSavingResult(true);

    updatedTournament.matches[matchIndex].winnerId = winnerId;
    updatedTournament.matches[matchIndex].status = 'completed';
    updatedTournament.matches[matchIndex].score = result?.score || {
      teamA: winnerId === match.teamA.id ? 1 : 0,
      teamB: winnerId === match.teamB.id ? 1 : 0,
    };
    updatedTournament = syncTeamPointsFromMatches(updatedTournament);
    updatedTournament = reconcileTournamentCourts(updatedTournament, {
      courtAssignments: updatedTournament.courtAssignments,
    });

    const updatedRoundMatches = updatedTournament.matches.filter((item) => item.round === updatedTournament.currentRound);
    const updatedCompletedInRound = updatedRoundMatches.filter((item) => item.status === 'completed').length;
    const winnerTeam = updatedTournament.teams.find((team) => team.id === winnerId);

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showToast?.(
        t('tournament.scoreSaved', { team: winnerTeam ? getTeamName(winnerTeam) : t('common.winner') }),
        updatedCompletedInRound === updatedRoundMatches.length
          ? t('tournament.stageComplete', { stage: getStageTitle(savedTournament, t) })
          : t('tournament.matchesLeft', { count: updatedRoundMatches.length - updatedCompletedInRound, plural: updatedRoundMatches.length - updatedCompletedInRound === 1 ? '' : 'es' }),
        'success'
      );

      if (updatedCompletedInRound === updatedRoundMatches.length && savedTournament.currentRound === 1) {
        if (savedTournament.format === 'league') {
          setTimeout(() => advanceToLeagueRound2(savedTournament), 700);
        } else {
          setTimeout(() => advanceToRound2(savedTournament), 700);
        }
      }
    } catch (error) {
      console.error('Error saving score:', error);
      showAlert(t('alerts.error'), t('tournament.saveError'));
    } finally {
      isSavingResultRef.current = false;
      setIsSavingResult(false);
    }
  };

  const setAsActiveMatch = async (match) => {
    if (isReadOnly) {
      showAlert(t('tournament.closedTitle'), t('tournament.closedCourt'));
      return;
    }

    if (!canUpdateScores) {
      showAlert(t('tournament.sharedAccessRequiredTitle'), t('tournament.sharedAccessRequiredMessage'));
      return;
    }

    const updatedTournament = promoteMatchToActiveCourt({
      tournament,
      matchId: match.id,
      courtAssignments: resolvedCourtAssignments,
    });

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
    } catch (error) {
      console.error('Error updating active match:', error);
      showAlert(t('alerts.error'), t('tournament.currentError'));
    }
  };

  const advanceToRound2 = async (tournamentData) => {
    let updatedTournament = syncTeamPointsFromMatches(JSON.parse(JSON.stringify(tournamentData)));
    const semifinalsExist = updatedTournament.matches.some((match) => match.round === 2 && match.matchType === 'semifinal');
    if (semifinalsExist) return;

    const { leaderboard: rankedTeams } = buildLeaderboard(updatedTournament);
    const top4Teams = rankedTeams.slice(0, 4);
    if (top4Teams.length < 4) {
      showAlert(t('tournament.cupNeedsMoreTitle'), t('tournament.cupNeedsMoreMessage'));
      return;
    }

    const semifinal1 = { id: 'round2_semifinal_1', round: 2, matchType: 'semifinal', teamA: top4Teams[0], teamB: top4Teams[3], winnerId: null, status: 'pending' };
    const semifinal2 = { id: 'round2_semifinal_2', round: 2, matchType: 'semifinal', teamA: top4Teams[1], teamB: top4Teams[2], winnerId: null, status: 'pending' };
    updatedTournament.matches.push(semifinal1, semifinal2);
    updatedTournament.currentRound = 2;
    updatedTournament.currentMatchId = semifinal1.id;
    updatedTournament = reconcileTournamentCourts(updatedTournament, { courtAssignments: [], preferredMatchId: semifinal1.id });

    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showToast?.(t('tournament.semifinalsReady'), t('tournament.semifinalsReadyDetail'), 'success');
    } catch (error) {
      console.error('Error advancing to Round 2:', error);
      showAlert(t('alerts.error'), 'Could not advance to semifinals. Please try again.');
    }
  };

  const advanceToLeagueRound2 = async (tournamentData) => {
    let updatedTournament = JSON.parse(JSON.stringify(tournamentData));
    updatedTournament.currentRound = 2;
    const firstPendingRound2 = updatedTournament.matches.find((match) => match.round === 2 && match.status === 'pending');
    updatedTournament.currentMatchId = firstPendingRound2 ? firstPendingRound2.id : null;
    updatedTournament = reconcileTournamentCourts(updatedTournament, { courtAssignments: [], preferredMatchId: updatedTournament.currentMatchId });
    try {
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      showToast?.(t('tournament.round2Started'), t('tournament.round2StartedDetail'), 'success');
    } catch (error) {
      console.error('Error advancing to League Round 2:', error);
      showAlert(t('alerts.error'), 'Could not advance to Round 2. Please try again.');
    }
  };

  const createFinals = useCallback(
    async (tournamentData) => {
      const updatedTournament = JSON.parse(JSON.stringify(tournamentData));
      const semifinalMatches = updatedTournament.matches.filter((match) => match.round === 2 && match.matchType === 'semifinal' && match.status === 'completed');
      if (semifinalMatches.length !== 2) return;
      if (updatedTournament.matches.some((match) => match.matchType === 'final')) return;

      const semifinal1Winner = updatedTournament.teams.find((team) => team.id === semifinalMatches[0].winnerId);
      const semifinal2Winner = updatedTournament.teams.find((team) => team.id === semifinalMatches[1].winnerId);
      if (!semifinal1Winner || !semifinal2Winner) return;

      const finals = { id: 'round2_finals', round: 2, matchType: 'final', teamA: semifinal1Winner, teamB: semifinal2Winner, winnerId: null, status: 'pending' };
      updatedTournament.matches.push(finals);
      updatedTournament.currentMatchId = finals.id;
      const nextTournament = reconcileTournamentCourts(updatedTournament, { courtAssignments: [], preferredMatchId: finals.id });

      try {
        const savedTournament = await updateTournamentRecord(nextTournament);
        setTournament(savedTournament);
        showToast?.(t('tournament.finalReady'), t('tournament.finalReadyDetail'), 'success');
      } catch (error) {
        console.error('Error creating finals:', error);
        showAlert(t('alerts.error'), 'Could not create the final. Please try again.');
      }
    },
    [setTournament, showAlert, showToast, t]
  );

  useEffect(() => {
    if (!isReadOnly && tournament.currentRound === 2 && tournament.format !== 'league') {
      const semifinalMatches = tournament.matches.filter((match) => match.round === 2 && match.matchType === 'semifinal');
      const completedSemifinals = semifinalMatches.filter((match) => match.status === 'completed');
      const finalsExists = tournament.matches.some((match) => match.matchType === 'final');
      if (completedSemifinals.length === 2 && !finalsExists) {
        setTimeout(() => createFinals(tournament), 700);
      }
    }
  }, [isReadOnly, tournament, createFinals]);

  const confirmEndTournament = async () => {
    setShowEndConfirm(false);
    try {
      const finishedTournament = tournament;
      await endTournamentRecord(tournament);
      if (onTournamentEnded) {
        await onTournamentEnded(finishedTournament, { replace: true });
      } else {
        setTournament(null);
        setScreen('home');
      }
    } catch (error) {
      console.error('Error ending tournament:', error);
      showAlert(t('alerts.error'), 'Could not end tournament.');
    }
  };

  const confirmReopenTournament = async () => {
    setShowReopenConfirm(false);
    try {
      const savedTournament = await reopenTournamentRecord(tournament);
      setTournament(savedTournament);
      showToast?.(t('tournament.reopenedToast'), t('tournament.reopenedToastDetail'), 'success');
    } catch (error) {
      console.error('Error reopening tournament:', error);
      showAlert(t('alerts.error'), 'Could not reopen tournament.');
    }
  };

  return (
    <ScreenShell className="pb-24 sm:pb-5">
      <StageBar
        tournament={tournament}
        activeCourtAssignments={resolvedCourtAssignments}
        isFinished={isTournamentFinished}
        isEnded={isReadOnly}
        completedInRound={completedInRound}
        currentRoundMatches={currentRoundMatches}
        pendingMatches={pendingMatches}
        completedMatches={completedMatches}
        courtCount={courtCount}
        roundProgress={roundProgress}
        t={t}
      />

      {(isTournamentFinished || isReadOnly) && (
        <>
          <FinishedSummary
            title={isReadOnly && !isTournamentFinished ? 'Tournament Ended' : 'Tournament Finished'}
            champion={champion}
            leaderboard={leaderboard}
            teamStats={teamStats}
            completedMatches={completedMatches}
            finalMatch={finalMatch}
            onEndTournament={canEndTournament ? () => setShowEndConfirm(true) : null}
            onReopenTournament={canReopenTournament ? () => setShowReopenConfirm(true) : null}
            t={t}
          />
          <TournamentSummaryShareCard
            title={resultTitle}
            dateLabel={resultDateLabel}
            formatLabel={resultFormatLabel}
            champion={champion}
            leaderboard={leaderboard}
            teamStats={teamStats}
            completedMatches={completedMatches}
            pendingMatches={remainingMatches}
            tournament={tournament}
            showAlert={showAlert}
          />
        </>
      )}

      {!isTournamentFinished && !isReadOnly && (
        <Panel>
          <SectionHeading
            title={t('tournament.activeCourts')}
            detail={t('tournament.playing', { active: activeMatches.length, total: courtCount })}
            actions={<Pill>{t('tournament.waiting', { count: waitingMatchesCount })}</Pill>}
          />
          <div className="grid gap-2 md:grid-cols-2">
            {courtSlots.map((match, index) => (
              <CourtCard key={match?.id || `empty-court-${index}`} courtNumber={index + 1} match={match} onDeclareWinner={handleDeclareWinner} disabled={isSavingResult || !canUpdateScores} t={t} />
            ))}
          </div>
        </Panel>
      )}

      {shareLink && !isReadOnly && !isTournamentFinished && (
        <LiveShareStrip
          shareLink={shareLink}
          isCopyingLink={isCopyingLink}
          copyFeedback={copyFeedback}
          onCopy={handleCopyShareLink}
          t={t}
        />
      )}

      <Panel>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-club-wash p-1">
          <TabButton active={activePanel === 'standings'} onClick={() => setActivePanel('standings')}>
            {t('tournament.table')}
          </TabButton>
          <TabButton active={activePanel === 'upcoming'} onClick={() => setActivePanel('upcoming')}>
            {t('common.next')} <span className="ml-1 text-[0.65rem] opacity-70">{upcomingMatches.length}</span>
          </TabButton>
          <TabButton active={activePanel === 'completed'} onClick={() => setActivePanel('completed')}>
            {t('common.done')} <span className="ml-1 text-[0.65rem] opacity-70">{completedMatches.length}</span>
          </TabButton>
        </div>

        {activePanel === 'standings' && (
          <div className="mt-3 space-y-2">
            {leaderboard.map((team, index) => {
              const stats = teamStats.get(team.id) || emptyTeamStats();
              const isLeader = index === 0;
              const isTop4 = index < 4 && tournament.currentRound === 1 && tournament.format !== 'league';
              const isChampion = champion?.id === team.id && isTournamentFinished;
              return (
                <StandingRow key={team.id} rank={index + 1} team={team} stats={stats} highlighted={isLeader || isTop4 || isChampion} label={getStandingLabel({ isLeader, isTop4, isChampion, format: tournament.format })} />
              );
            })}
          </div>
        )}

        {activePanel === 'upcoming' && (
          <MatchPanel emptyText={t('tournament.upcomingEmpty')}>
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} onSetCurrent={canUpdateScores ? setAsActiveMatch : null} isCurrent={false} />
            ))}
          </MatchPanel>
        )}

        {activePanel === 'completed' && (
          <MatchPanel emptyText={t('tournament.completedEmpty')}>
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} isCurrent={false} />
            ))}
          </MatchPanel>
        )}
      </Panel>

      <section className={`hidden gap-3 sm:grid ${canEditTeams ? 'sm:grid-cols-2' : 'sm:grid-cols-1'}`}>
        {canEditTeams && (
          <Button tone="secondary" onClick={() => setShowEditTeams(true)}>
            <UsersIcon className="h-5 w-5" />
            {t('tournament.editTeams')}
          </Button>
        )}
        <Button tone="secondary" onClick={() => setShowGameHistory(true)}>
          <CheckIcon className="h-5 w-5" />
          {t('tournament.matchHistory')}
        </Button>
      </section>

      {canEndTournament && !isTournamentFinished && !isReadOnly && (
        <Button tone="danger" onClick={() => setShowEndConfirm(true)} className="w-full">
          <TrashIcon className="h-5 w-5" />
          {t('tournament.endTournament')}
        </Button>
      )}

      <BottomActionBar className="sm:hidden">
        <div className={`mx-auto grid max-w-6xl gap-2 ${canEditTeams ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-1'}`}>
          {canEditTeams && (
            <Button tone="secondary" onClick={() => setShowEditTeams(true)}>
              <UsersIcon className="h-4 w-4" />
              {t('common.teams')}
            </Button>
          )}
          <Button tone="secondary" onClick={() => setShowGameHistory(true)}>
            <CheckIcon className="h-4 w-4" />
            {t('tournament.matchHistory')}
          </Button>
        </div>
      </BottomActionBar>

      {showEndConfirm && (
        <ConfirmationModal
          title={t('tournament.endTitle')}
          message={t('tournament.endMessage')}
          onConfirm={confirmEndTournament}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}

      {showReopenConfirm && (
        <ConfirmationModal
          title={t('tournament.reopenTitle')}
          message={t('tournament.reopenMessage')}
          onConfirm={confirmReopenTournament}
          onCancel={() => setShowReopenConfirm(false)}
        />
      )}

      {showEditTeams && canEditTeams && (
        <EditTeamsModal tournament={tournament} setTournament={setTournament} onClose={() => setShowEditTeams(false)} showAlert={showAlert} showToast={showToast} />
      )}

      {showGameHistory && (
        <GameHistoryModal
          tournament={tournament}
          courtAssignments={resolvedCourtAssignments}
          setTournament={setTournament}
          onClose={() => setShowGameHistory(false)}
          showAlert={showAlert}
          showToast={showToast}
          readOnly={!canUpdateScores}
        />
      )}
    </ScreenShell>
  );
}

function getStageTitle(tournament, t) {
  if (tournament.format === 'league') {
    if (tournament.currentRound === 1) return t('tournament.stageLeagueRound1');
    if (tournament.currentRound === 2) return t('tournament.stageLeagueRound2');
    return t('tournament.stageLeagueRound', { round: tournament.currentRound });
  }

  if (tournament.currentRound === 1) return t('tournament.stageCupGroup');
  if (tournament.matches.some((match) => match.matchType === 'final' && match.status !== 'completed')) return t('tournament.stageCupFinal');
  if (tournament.currentRound === 2) return t('tournament.stageCupSemi');
  return t('tournament.stageCupRound', { round: tournament.currentRound });
}

function getMatchLabel(match) {
  if (match.matchType === 'final') return 'Championship Final';
  if (match.matchType === 'semifinal') return 'Semifinal';
  return 'Group Match';
}

function getStandingLabel({ isLeader, isTop4, isChampion, format }) {
  if (isChampion) return 'Champion';
  if (format === 'league' && isLeader) return 'Leader';
  if (isTop4) return 'Top 4';
  return '';
}

function LiveShareStrip({ shareLink, isCopyingLink, copyFeedback, onCopy, t }) {
  return (
    <Panel className="bg-club-soft">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-black text-club-ink">{t('tournament.shareTitle')}</p>
          <p className="mt-0.5 truncate text-xs font-semibold text-club-muted">{shareLink}</p>
        </div>
        <Button tone="blue" onClick={onCopy} disabled={isCopyingLink} className="shrink-0">
          <ShareIcon className="h-5 w-5" />
          {isCopyingLink ? t('tournament.copying') : copyFeedback || t('tournament.copyLink')}
        </Button>
      </div>
    </Panel>
  );
}

function StageBar({ tournament, activeCourtAssignments, isFinished, isEnded, completedInRound, currentRoundMatches, pendingMatches, completedMatches, courtCount, roundProgress, t }) {
  const stageTitle = isEnded ? t('history.ended') : isFinished ? t('history.complete') : getStageTitle(tournament, t);
  const stageLabel = tournament.format === 'league' ? t('common.league') : t('common.cup');
  const activeCourtIds = new Set((activeCourtAssignments || []).filter(Boolean));
  const waitingCount = pendingMatches.filter((match) => !activeCourtIds.has(match.id)).length;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{stageLabel}</p>
          <h2 className="truncate text-xl font-black leading-tight text-club-ink">{stageTitle}</h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-black tabular-nums text-club-green">{completedInRound}/{currentRoundMatches.length || 0}</p>
          <p className="text-[0.65rem] font-bold uppercase tracking-wide text-club-muted">{t('common.matches')}</p>
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-club-wash">
        <div className="h-full rounded-full bg-club-green transition-all" style={{ width: `${roundProgress}%` }} />
      </div>

      <p className="mt-3 truncate text-sm font-bold text-club-muted">
        {tournament.teams.length} {t('common.teams').toLowerCase()} / {courtCount} {t('common.courts').toLowerCase()} / {waitingCount} {t('common.waiting').toLowerCase()} / {completedMatches.length} {t('common.done').toLowerCase()}
      </p>
    </Panel>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-md px-2 text-sm font-black transition ${
        active ? 'motion-soft-pop bg-club-green text-club-greenDeep' : 'text-club-muted hover:bg-club-soft hover:text-club-ink'
      }`}
    >
      {children}
    </button>
  );
}

function MatchPanel({ emptyText, children }) {
  const hasChildren = React.Children.count(children) > 0;

  return (
    <div className="mt-3 space-y-2">
      {hasChildren ? children : <EmptyState title={emptyText} />}
    </div>
  );
}

function CourtCard({ courtNumber, match, onDeclareWinner, disabled, t }) {
  if (!match) {
    return (
      <div className="rounded-lg border border-dashed border-club-borderStrong bg-club-soft p-3 text-center">
        <div className="flex min-h-28 flex-col items-center justify-center">
          <Pill tone="blue">Court {courtNumber}</Pill>
          <h3 className="mt-2 text-base font-black text-club-ink">{t('common.waiting')}</h3>
          <p className="mt-1 max-w-xs text-xs font-semibold text-club-muted">{t('tournament.noSafeMatch')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-club-border bg-club-surface p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-club-muted">
          <CourtIcon className="h-3.5 w-3.5" />
          Court {courtNumber}
        </p>
        <Pill>{getMatchLabel(match)}</Pill>
      </div>
      <CurrentMatchCard match={match} onDeclareWinner={onDeclareWinner} disabled={disabled} />
    </div>
  );
}

function StandingRow({ rank, team, stats, highlighted, label }) {
  return (
    <div className={`grid grid-cols-[36px_1fr_auto] items-center gap-3 rounded-lg border p-3 ${highlighted ? 'border-club-borderStrong bg-club-surface' : 'border-club-border bg-club-soft'}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-black ${highlighted ? 'bg-club-green/14 text-club-green' : 'bg-club-wash text-club-muted'}`}>{rank}</span>
      <div className="min-w-0">
        <p className="break-words font-black leading-tight text-club-ink">{getTeamName(team)}</p>
        {label && <p className="mt-1 text-xs font-black uppercase tracking-wide text-club-green">{label}</p>}
      </div>
      <div className="text-right">
        <p className="text-xl font-black tabular-nums text-club-ink">{stats.points}</p>
        <p className="text-xs font-bold tabular-nums text-club-muted">
          {stats.wins}-{stats.losses} / {stats.diff > 0 ? '+' : ''}
          {stats.diff}
        </p>
      </div>
    </div>
  );
}

function FinishedSummary({ title, champion, leaderboard, teamStats, completedMatches, finalMatch, onEndTournament, onReopenTournament, t }) {
  const topTeams = leaderboard.slice(0, 3);

  return (
    <Panel className="border-club-green/50 bg-club-soft">
      <div>
        <span className="grid h-14 w-14 place-items-center rounded-lg bg-club-green text-club-greenDeep">
          <TrophyIcon className="h-9 w-9" />
        </span>
        <p className="mt-4 text-xs font-black uppercase tracking-wide text-club-green">{title}</p>
        <h2 className="mt-2 text-3xl font-black text-club-ink">{champion ? t('tournament.championMoment') : t('tournament.resultsLocked')}</h2>
        <p className="mt-2 text-xl font-black text-club-green">{champion ? getTeamName(champion) : 'Champion pending'}</p>
        {finalMatch && (
          <p className="mt-2 text-sm font-bold text-club-muted">
            Final: {getTeamName(finalMatch.teamA)} vs {getTeamName(finalMatch.teamB)}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="rounded-lg border border-club-border bg-club-surface p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-club-muted">
            <TrophyIcon className="h-5 w-5 text-club-green" />
            {t('tournament.finalRanking')}
          </h3>
          <div className="grid gap-2 sm:grid-cols-3">
            {topTeams.map((team, index) => {
              const stats = teamStats.get(team.id) || emptyTeamStats();
              return (
                <div
                  key={team.id}
                  className={`rounded-lg p-3 text-center ${
                    index === 0 ? 'bg-club-green/12 ring-2 ring-club-green/40' : 'bg-club-soft'
                  }`}
                >
                  <span className={`mx-auto grid h-10 w-10 place-items-center rounded-lg text-sm font-black ${index === 0 ? 'bg-club-green text-club-greenDeep' : 'bg-club-surface text-club-muted'}`}>
                    {index + 1}
                  </span>
                  <span className="mt-2 block min-w-0 break-words font-black leading-tight text-club-ink">{getTeamName(team)}</span>
                  <span className="mt-1 block text-sm font-black text-club-muted">{stats.points} pts</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-club-border bg-club-surface p-4 text-center sm:min-w-40">
          <p className="text-4xl font-black tabular-nums text-club-ink">{completedMatches.length}</p>
          <p className="text-sm font-bold text-club-muted">{t('tournament.matchesPlayed')}</p>
          {onEndTournament && (
            <Button onClick={onEndTournament} className="mt-4 w-full">
              End Tournament
            </Button>
          )}
          {onReopenTournament && (
            <Button onClick={onReopenTournament} className="mt-4 w-full">
              Reopen Tournament
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? dateFormatter.format(date) : 'No date';
}
