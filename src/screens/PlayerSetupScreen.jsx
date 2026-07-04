import React, { useMemo, useState } from 'react';
import { createTournamentRecord } from '../utils/tournamentService';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import { buildTournament } from '../utils/tournamentBuilder';
import { BottomActionBar, Button, EmptyState, InlineNotice, MetricItem, PageHeader, Panel, Pill, ScreenShell, SectionHeading, TextInput } from '../components/Ui.jsx';
import { SetupOptionsPanel, SetupProgress, SetupSummary } from '../components/NightSetupFlow.jsx';
import { useNightSetupFlow } from '../hooks/useNightSetupFlow.js';
import { UsersIcon, XIcon } from '../components/Icons';
import { useI18n } from '../i18n/useI18n.js';

const stepLabels = {
  participants: 'Players',
  format: 'Format',
  review: 'Start',
};

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const { t } = useI18n();
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const flow = useNightSetupFlow({ participantCount: players.length });

  const setupStatus = useMemo(() => getSetupStatus(players, flow.format), [players, flow.format]);
  const hasOddPlayer = players.length % 2 !== 0;

  const handleAddPlayer = () => {
    const validation = validatePlayerName(playerName, players);
    if (!validation.isValid) {
      setPlayerError(validation.message);
      showAlert(t('setup.checkPlayerTitle'), validation.message);
      return;
    }

    setPlayers((current) => [...current, validation.name]);
    setPlayerName('');
    setPlayerError('');
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers((current) => current.filter((player) => player !== nameToRemove));
    setPlayerError('');
  };

  const handleCreateTournament = async () => {
    const currentStatus = getSetupStatus(players, flow.format);
    if (!currentStatus.isValid) {
      showAlert(t('setup.notReadyTitle'), currentStatus.message);
      return;
    }

    setIsSaving(true);

    const newTournament = buildTournament({
      players,
      format: flow.format,
      scoringPreset: flow.scoringPreset,
      maxSets: flow.maxSets,
      deuceMode: flow.deuceMode,
      courtCount: flow.courtCount,
    });

    try {
      const createdTournament = await createTournamentRecord(newTournament);
      setTournament(createdTournament);
      setScreen('tournament');
    } catch (error) {
      console.error('Error creating tournament:', error);
      showAlert(t('alerts.error'), t('setup.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const metrics = [
    { label: t('common.players'), value: players.length, detail: `${setupStatus.minPlayers}+` },
    { label: t('common.teams'), value: setupStatus.teamCount, detail: hasOddPlayer ? 'sub' : 'paired' },
    { label: t('common.courts'), value: flow.courtCount, detail: flow.courtCount === 1 ? 'court' : 'courts' },
  ];
  const formatLabel = flow.format === 'cup' ? t('common.cup') : t('common.league');
  const recommendation = flow.formatTouched ? null : `${formatLabel} is selected automatically for ${players.length || 'your current'} player list.`;

  return (
    <ScreenShell className="pb-28 sm:pb-5">
      <PageHeader eyebrow={t('setup.createTournament')} title={flow.format === 'league' ? t('setup.leagueNight') : t('setup.cupNight')} detail={t('setup.quickSetupDetail')} />

      <SetupProgress currentStep={flow.currentStep} onStepChange={flow.setStep} labels={stepLabels} />

      <SetupSummary title={t('setup.createTournament')} setupStatus={setupStatus} metrics={metrics} recommendation={recommendation} />

      {flow.currentStep === 'participants' && (
        <ParticipantsStep
          players={players}
          playerName={playerName}
          playerError={playerError}
          isSaving={isSaving}
          setPlayerName={setPlayerName}
          setPlayerError={setPlayerError}
          onAddPlayer={handleAddPlayer}
          onRemovePlayer={handleRemovePlayer}
          t={t}
        />
      )}

      {flow.currentStep === 'format' && (
        <SetupOptionsPanel flow={flow} setupStatus={setupStatus} showScoring t={t} />
      )}

      {flow.currentStep === 'review' && (
        <ReviewStep players={players} setupStatus={setupStatus} flow={flow} t={t} />
      )}

      <BottomActionBar>
        <SetupActions
          currentStep={flow.currentStep}
          setupStatus={setupStatus}
          isSaving={isSaving}
          onBack={() => flow.setStep(flow.currentStep === 'format' ? 'participants' : 'format')}
          onNext={() => flow.setStep(flow.currentStep === 'participants' ? 'format' : 'review')}
          onStart={handleCreateTournament}
          t={t}
        />
      </BottomActionBar>
    </ScreenShell>
  );
}

function ParticipantsStep({ players, playerName, playerError, isSaving, setPlayerName, setPlayerError, onAddPlayer, onRemovePlayer, t }) {
  return (
    <Panel>
      <SectionHeading title={t('setup.playersTitle')} detail={t('setup.playersHint', { count: 4 })} count={players.length} />
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <TextInput
            type="text"
            invalid={Boolean(playerError)}
            placeholder={t('setup.playerName')}
            value={playerName}
            maxLength={40}
            autoCapitalize="words"
            autoComplete="name"
            enterKeyHint="done"
            onChange={(event) => {
              setPlayerName(event.target.value);
              if (playerError) setPlayerError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddPlayer();
              }
            }}
          />
          {playerError && <p className="mt-2 text-sm font-bold text-[#DB4145]">{playerError}</p>}
        </div>
        <Button onClick={onAddPlayer} disabled={isSaving}>
          <UsersIcon className="h-4 w-4" />
          {t('common.add')}
        </Button>
      </div>

      <div className="mt-3">
        {players.length > 0 ? (
          <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2">
            {players.map((player, index) => (
              <PlayerChip key={player} index={index + 1} name={player} onRemove={() => onRemovePlayer(player)} disabled={isSaving} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('setup.noPlayers')} detail={t('setup.addNames')} />
        )}
      </div>
    </Panel>
  );
}

function ReviewStep({ players, setupStatus, flow, t }) {
  return (
    <Panel>
      <SectionHeading title={t('setup.reviewTitle')} detail={setupStatus.message} />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricItem label={t('common.format')} value={flow.format === 'cup' ? t('common.cup') : t('common.league')} />
        <MetricItem label={t('common.players')} value={players.length} />
        <MetricItem label={t('common.courts')} value={flow.courtCount} />
      </div>
      {players.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {players.map((player) => (
            <Pill key={player}>{player}</Pill>
          ))}
        </div>
      )}
      {!setupStatus.isValid && <InlineNotice tone="info" className="mt-4">{setupStatus.message}</InlineNotice>}
    </Panel>
  );
}

function SetupActions({ currentStep, setupStatus, isSaving, onBack, onNext, onStart, t }) {
  if (currentStep === 'participants') {
    return (
      <Button className="w-full" size="lg" onClick={onNext}>
        {t('setup.nextFormat')}
      </Button>
    );
  }

  if (currentStep === 'format') {
    return (
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button tone="secondary" size="lg" onClick={onBack}>{t('nav.back')}</Button>
        <Button size="lg" onClick={onNext}>{t('setup.reviewStart')}</Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[auto_1fr] gap-2">
      <Button tone="secondary" size="lg" onClick={onBack}>{t('nav.back')}</Button>
      <Button size="lg" onClick={onStart} disabled={isSaving || !setupStatus.isValid}>
        {isSaving ? t('setup.creating') : t('setup.startTournament')}
      </Button>
    </div>
  );
}

function PlayerChip({ index, name, onRemove, disabled }) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-lg border border-club-border bg-club-soft py-1.5 pl-2 pr-1 shadow-sm">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-club-green text-xs font-black text-club-greenDeep">{getInitials(name) || index}</span>
      <span className="min-w-0 truncate text-sm font-black text-club-ink">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-club-muted transition hover:bg-[#DB4145]/10 hover:text-[#DB4145] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}
