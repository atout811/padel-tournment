import React, { useState } from 'react';
import { updateTournamentRecord } from '../../utils/tournamentService';
import { Button } from '../../components/Ui.jsx';
import { useI18n } from '../../i18n/useI18n.js';

export default function EditTeamsModal({ tournament, setTournament, onClose, showAlert, showToast }) {
  const { t } = useI18n();
  const [editableTeams, setEditableTeams] = useState(tournament.teams.map((team) => ({ ...team, players: [...team.players] })));
  const [availablePlayers] = useState(tournament.players);
  const [isSaving, setIsSaving] = useState(false);

  const handlePlayerChange = (teamIndex, playerIndex, newPlayer) => {
    if (!newPlayer) return;
    const newTeams = [...editableTeams];
    const oldPlayer = newTeams[teamIndex].players[playerIndex];
    if (oldPlayer === newPlayer) return;
    let swapTeamIndex = -1;
    let swapPlayerIndex = -1;
    for (let tIndex = 0; tIndex < newTeams.length; tIndex++) {
      if (tIndex !== teamIndex) {
        const pIndex = newTeams[tIndex].players.indexOf(newPlayer);
        if (pIndex !== -1) {
          swapTeamIndex = tIndex;
          swapPlayerIndex = pIndex;
          break;
        }
      }
    }
    if (swapTeamIndex !== -1) {
      newTeams[swapTeamIndex].players[swapPlayerIndex] = oldPlayer;
    }
    newTeams[teamIndex].players[playerIndex] = newPlayer;
    setEditableTeams(newTeams);
  };

  const saveTeamChanges = async () => {
    const allAssignedPlayers = editableTeams.flatMap((team) => team.players);
    const uniquePlayers = new Set(allAssignedPlayers);
    if (uniquePlayers.size !== allAssignedPlayers.length) {
      showAlert(t('modals.invalidTeamsTitle'), t('modals.invalidTeamsMessage'));
      return;
    }
    const updatedMatches = tournament.matches.map((match) => {
      const updatedTeamA = editableTeams.find((team) => team.id === match.teamA.id);
      const updatedTeamB = editableTeams.find((team) => team.id === match.teamB.id);
      return { ...match, teamA: updatedTeamA || match.teamA, teamB: updatedTeamB || match.teamB };
    });
    const updatedTournament = { ...tournament, teams: editableTeams, matches: updatedMatches };
    try {
      setIsSaving(true);
      const savedTournament = await updateTournamentRecord(updatedTournament);
      setTournament(savedTournament);
      onClose();
      if (showToast) {
        showToast(t('modals.teamsUpdated'), '', 'success');
      } else {
        showAlert(t('modals.success'), t('modals.teamsUpdatedMessage'));
      }
    } catch (error) {
      console.error('Error saving team changes:', error);
      showAlert(t('alerts.error'), t('modals.saveTeamsError'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-club-bg/75 p-3 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-club-border bg-club-surface p-4 shadow-2xl shadow-club-shadow/20 sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{t('modals.tournamentActions')}</p>
          <h3 className="mt-1 text-2xl font-black leading-tight text-club-ink">{t('modals.editTeams')}</h3>
          <p className="mt-1 text-sm font-semibold text-club-muted">{t('modals.editTeamsDetail')}</p>
        </div>
        <div className="mb-5 space-y-3">
          {editableTeams.map((team, teamIndex) => (
            <div key={team.id} className="rounded-lg border border-club-border bg-club-soft p-3">
              <h4 className="mb-2 font-black text-club-ink">{t('modals.team', { number: teamIndex + 1 })}</h4>
              <div className="space-y-2">
                {team.players.map((player, playerIndex) => (
                  <select key={playerIndex} value={player} onChange={(e) => handlePlayerChange(teamIndex, playerIndex, e.target.value)} className="min-h-12 w-full rounded-lg border border-club-border bg-club-wash p-2 font-bold text-club-ink outline-none focus:border-club-green focus:ring-4 focus:ring-club-green/20">
                    {availablePlayers.map((p) => (
                      <option key={p} value={p}>
                        {p}
                        {editableTeams.some((item, tIndex) => tIndex !== teamIndex && item.players.includes(p)) ? ` (${t('modals.willSwap')})` : ''}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button tone="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={saveTeamChanges} disabled={isSaving}>{isSaving ? t('modals.saving') : t('modals.saveChanges')}</Button>
        </div>
      </div>
    </div>
  );
}


