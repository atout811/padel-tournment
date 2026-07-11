import React, { useState } from 'react';
import { updateTournamentRecord } from '../../utils/tournamentService';
import { summarizePadelScore } from '../../utils/padelScoring';
import { reconcileCupProgression, reconcileTournamentCourts, syncTeamPointsFromMatches } from '../../utils/tournamentRules';
import { Button, EmptyState, Pill } from '../../components/Ui.jsx';
import { useI18n } from '../../i18n/useI18n.js';

const getTeamName = (team) => team.players.join(' & ');

export default function GameHistoryModal({ tournament, courtAssignments = [], setTournament, onClose, showAlert, showToast, readOnly = false }) {
  const { t } = useI18n();
  const completedMatches = tournament.matches.filter((m) => m.status === 'completed');
  const [updatingMatchId, setUpdatingMatchId] = useState(null);

  const handleWinnerChange = async (match, newWinnerId) => {
    if (readOnly) {
      showAlert(t('tournament.closedTitle'), t('tournament.closedResults'));
      return;
    }

    const updatedTournament = JSON.parse(JSON.stringify(tournament));
    if (!Array.isArray(updatedTournament.courtAssignments) || updatedTournament.courtAssignments.length === 0) {
      updatedTournament.courtAssignments = [...courtAssignments];
    }
    const matchIndex = updatedTournament.matches.findIndex((m) => m.id === match.id);
    if (matchIndex === -1) return;

    const currentWinnerId = updatedTournament.matches[matchIndex].winnerId || null;
    if (currentWinnerId === (newWinnerId || null)) {
      return;
    }

    setUpdatingMatchId(match.id);

    updatedTournament.matches[matchIndex].winnerId = newWinnerId || null;
    if (updatedTournament.matches[matchIndex].score?.sets) {
      updatedTournament.matches[matchIndex].score.winnerId = newWinnerId || null;
      updatedTournament.matches[matchIndex].score.isComplete = Boolean(newWinnerId);
    }
    if (!newWinnerId) {
      updatedTournament.matches[matchIndex].status = 'pending';
    }
    if (newWinnerId) {
      updatedTournament.matches[matchIndex].status = 'completed';
    }
    try {
      const reconciledTournament =
        updatedTournament.format === 'league'
          ? reconcileTournamentCourts(syncTeamPointsFromMatches(updatedTournament), {
              courtAssignments: updatedTournament.courtAssignments,
            })
          : reconcileCupProgression(updatedTournament);
      const savedTournament = await updateTournamentRecord(reconciledTournament);
      setTournament(savedTournament);
      if (showToast) {
        showToast(t('modals.resultUpdated'), '', 'success');
      } else {
        showAlert(t('modals.success'), t('modals.resultUpdatedMessage'));
      }
    } catch (error) {
      console.error('Error updating match result:', error);
      showAlert(t('alerts.error'), t('modals.updateResultError'));
    } finally {
      setUpdatingMatchId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-club-bg/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-club-border bg-club-surface p-4 shadow-2xl shadow-club-shadow/20 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-club-muted">{t('modals.tournamentActions')}</p>
            <h3 className="mt-1 text-2xl font-black leading-tight text-club-ink">{t('modals.matchLog')}</h3>
            <p className="mt-1 text-sm font-semibold text-club-muted">{t('modals.completedMatches', { count: completedMatches.length, plural: completedMatches.length === 1 ? '' : 'es' })}</p>
          </div>
          <Button tone="secondary" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>

        {completedMatches.length === 0 ? (
          <EmptyState title={t('modals.noCompletedMatches')} />
        ) : (
          <div className="space-y-2">
            {completedMatches.map((match) => {
              const teamAWon = match.winnerId === match.teamA.id;
              const teamBWon = match.winnerId === match.teamB.id;
              const hasScore = Number.isFinite(Number(match.score?.teamA)) && Number.isFinite(Number(match.score?.teamB));
              const padelScoreSummary = summarizePadelScore(match.score, match.teamA.id, match.teamB.id);
              return (
                <div key={match.id} className="rounded-lg border border-club-border bg-club-soft p-3">
                  <div className="mb-3 grid grid-cols-[1fr_auto] gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className={`break-words font-black ${teamAWon ? 'text-club-green' : 'text-club-ink'}`}>{getTeamName(match.teamA)}</p>
                      <p className={`break-words font-black ${teamBWon ? 'text-club-green' : 'text-club-ink'}`}>{getTeamName(match.teamB)}</p>
                    </div>
                    <div className="grid content-center gap-2 text-center">
                      {padelScoreSummary ? (
                        <span className="max-w-32 rounded-md bg-club-wash px-3 py-2 text-xs font-black leading-relaxed text-club-ink">
                          {padelScoreSummary}
                        </span>
                      ) : hasScore ? (
                        <>
                          <span className="rounded-md bg-club-wash px-3 py-1 text-lg font-black tabular-nums text-club-ink">{match.score.teamA}</span>
                          <span className="rounded-md bg-club-wash px-3 py-1 text-lg font-black tabular-nums text-club-ink">{match.score.teamB}</span>
                        </>
                      ) : (
                        <span className="text-xs font-bold text-club-muted">{t('modals.noScore')}</span>
                      )}
                    </div>
                  </div>
                  {readOnly ? (
                    <div className="border-t border-club-border pt-3">
                      <Pill tone="greenSoft">{t('match.winner', { team: getWinnerName(match, t) })}</Pill>
                    </div>
                  ) : (
                    <div className="border-t border-club-border pt-3">
                      <label className="mb-2 block text-sm font-black text-club-muted">{t('modals.changeWinner')}</label>
                      <select
                        value={match.winnerId || ''}
                        onChange={(e) => handleWinnerChange(match, e.target.value)}
                        disabled={updatingMatchId === match.id}
                        className="min-h-12 w-full rounded-lg border border-club-border bg-club-wash p-2 font-bold text-club-ink outline-none focus:border-club-green focus:ring-4 focus:ring-club-green/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">{t('modals.noWinner')}</option>
                        <option value={match.teamA.id}>{getTeamName(match.teamA)}</option>
                        <option value={match.teamB.id}>{getTeamName(match.teamB)}</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getWinnerName(match, t) {
  if (match.winnerId === match.teamA.id) return getTeamName(match.teamA);
  if (match.winnerId === match.teamB.id) return getTeamName(match.teamB);
  return t('modals.noWinner');
}
