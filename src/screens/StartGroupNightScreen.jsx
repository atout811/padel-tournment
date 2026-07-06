import React, { useEffect, useMemo, useState } from 'react';
import { fetchGroupPlayers, subscribeToGroupPlayers } from '../utils/groupPlayerService';
import { createGroupSession, linkGroupSessionTournament } from '../utils/groupSessionService';
import { createTournamentRecord } from '../utils/tournamentService';
import { buildTournament } from '../utils/tournamentBuilder';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import { BottomActionBar, Button, EmptyState, InlineNotice, MetricItem, PageHeader, Panel, Pill, ScreenShell, SectionHeading, TextInput } from '../components/Ui.jsx';
import { SetupOptionsPanel, SetupProgress, SetupSummary } from '../components/NightSetupFlow.jsx';
import { useNightSetupFlow } from '../hooks/useNightSetupFlow.js';
import { CheckIcon, UsersIcon, XIcon } from '../components/Icons';
import { useI18n } from '../i18n/useI18n.js';

export default function StartGroupNightScreen({ group, showAlert, setTournament, setScreen }) {
  const { t } = useI18n();
  const [players, setPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [guests, setGuests] = useState([]);
  const [guestName, setGuestName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const selectedPlayers = useMemo(() => players.filter((player) => selectedIds.has(player.id)), [players, selectedIds]);
  const participantNames = useMemo(() => [...selectedPlayers.map((player) => player.name), ...guests.map((guest) => guest.name)], [selectedPlayers, guests]);
  const flow = useNightSetupFlow({ participantCount: participantNames.length });
  const setupStatus = useMemo(() => getSetupStatus(participantNames, flow.format, t), [flow.format, participantNames, t]);
  const stepLabels = useMemo(
    () => ({
      participants: t('setup.playersTab'),
      format: t('setup.formatTab'),
      review: t('setup.reviewStart'),
    }),
    [t]
  );

  useEffect(() => {
    if (!group?.id) return;
    let active = true;
    fetchGroupPlayers(group.id)
      .then((items) => {
        if (!active) return;
        setPlayers(items);
        setSelectedIds(new Set(items.map((player) => player.id)));
      })
      .catch((error) => {
        console.error('Error loading players:', error);
        showAlert(t('alerts.error'), t('startNight.loadError'));
      });
    return () => {
      active = false;
    };
  }, [group?.id, showAlert, t]);

  useEffect(() => {
    if (!group?.id) return undefined;
    return subscribeToGroupPlayers(group.id, (items) => {
      setPlayers((currentPlayers) => {
        const currentIds = new Set(currentPlayers.map((player) => player.id));
        const newIds = items.filter((player) => !currentIds.has(player.id)).map((player) => player.id);
        if (newIds.length) {
          setSelectedIds((current) => new Set([...current, ...newIds]));
        }
        return items;
      });
    });
  }, [group?.id]);

  const togglePlayer = (playerId) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(playerId)) next.delete(playerId);
      else next.add(playerId);
      return next;
    });
  };

  const handleAddGuest = () => {
    const validation = validatePlayerName(guestName, participantNames, t);
    if (!validation.isValid) {
      showAlert(t('startNight.checkGuestTitle'), validation.message);
      return;
    }
    setGuests((current) => [...current, { id: `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, name: validation.name }]);
    setGuestName('');
  };

  const removeGuest = (guestId) => {
    setGuests((current) => current.filter((guest) => guest.id !== guestId));
  };

  const startNight = async () => {
    if (!setupStatus.isValid) {
      showAlert(t('startNight.notReadyTitle'), setupStatus.message);
      return;
    }

    const participantMeta = [
      ...selectedPlayers.map((player) => ({
        name: player.name,
        groupPlayerId: player.id,
        level: player.level,
        initialLevel: player.initialLevel || player.level,
        rating: player.rating,
        matchesPlayed: player.matchesPlayed || 0,
        wins: player.wins || 0,
        losses: player.losses || 0,
        currentStreak: player.currentStreak || 0,
        bestStreak: player.bestStreak || 0,
        source: 'group',
      })),
      ...guests.map((guest) => ({ name: guest.name, level: 3, source: 'guest' })),
    ];

    try {
      setIsSaving(true);
      const session = await createGroupSession({ groupId: group.id, participantMeta });
      const tournament = buildTournament({
        players: participantNames,
        format: flow.format,
        courtCount: flow.courtCount,
        metadata: {
          groupId: group.id,
          groupSessionId: session.id,
          participantMeta,
        },
      });
      const createdTournament = await createTournamentRecord(tournament);
      await linkGroupSessionTournament(session.id, createdTournament.id);
      setTournament(createdTournament);
      setScreen('tournament');
    } catch (error) {
      console.error('Error starting group night:', error);
      showAlert(t('alerts.error'), error.message || t('startNight.startError'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!group) {
    return (
      <ScreenShell>
        <Button onClick={() => setScreen('groups')}>{t('startNight.backToGroups')}</Button>
      </ScreenShell>
    );
  }

  const metrics = [
    { label: t('common.players'), value: participantNames.length, detail: `${setupStatus.minPlayers}+` },
    { label: t('common.teams'), value: setupStatus.teamCount, detail: participantNames.length % 2 ? t('common.sub') : t('common.paired') },
    { label: t('common.courts'), value: flow.courtCount, detail: flow.courtCount === 1 ? t('common.court') : t('common.courts') },
  ];
  const formatLabel = flow.format === 'cup' ? t('common.cup') : t('common.league');
  const recommendation = flow.formatTouched
    ? null
    : participantNames.length
      ? t('setup.autoFormatTonight', { format: formatLabel, count: participantNames.length })
      : t('setup.autoFormatTonightFallback', { format: formatLabel });

  return (
    <ScreenShell className="pb-28 sm:pb-5">
      <PageHeader eyebrow={t('startNight.tonight')} title={group.name} detail={t('startNight.setupDetail')} />

      <SetupProgress currentStep={flow.currentStep} onStepChange={flow.setStep} labels={stepLabels} />

      <SetupSummary title={t('startNight.groupNight')} setupStatus={setupStatus} metrics={metrics} recommendation={recommendation} t={t} />

      {flow.currentStep === 'participants' && (
        <ParticipantsStep
          players={players}
          selectedIds={selectedIds}
          participantCount={participantNames.length}
          guests={guests}
          guestName={guestName}
          setGuestName={setGuestName}
          onTogglePlayer={togglePlayer}
          onAddGuest={handleAddGuest}
          onRemoveGuest={removeGuest}
          t={t}
        />
      )}

      {flow.currentStep === 'format' && (
        <SetupOptionsPanel flow={flow} setupStatus={setupStatus} t={t} />
      )}

      {flow.currentStep === 'review' && (
        <ReviewStep selectedPlayers={selectedPlayers} guests={guests} setupStatus={setupStatus} flow={flow} t={t} />
      )}

      <BottomActionBar>
        <SetupActions
          currentStep={flow.currentStep}
          setupStatus={setupStatus}
          isSaving={isSaving}
          onBack={() => flow.setStep(flow.currentStep === 'format' ? 'participants' : 'format')}
          onNext={() => flow.setStep(flow.currentStep === 'participants' ? 'format' : 'review')}
          onStart={startNight}
          t={t}
        />
      </BottomActionBar>
    </ScreenShell>
  );
}

function ParticipantsStep({ players, selectedIds, participantCount, guests, guestName, setGuestName, onTogglePlayer, onAddGuest, onRemoveGuest, t }) {
  return (
    <div className="space-y-3">
      <Panel>
        <SectionHeading title={t('startNight.playingTonight')} detail={t('startNight.participantsDetail')} count={participantCount} />
        {players.length ? (
          <div className="grid max-h-[46vh] gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2">
            {players.map((player) => (
              <PlayerSelectRow key={player.id} player={player} selected={selectedIds.has(player.id)} onClick={() => onTogglePlayer(player.id)} t={t} />
            ))}
          </div>
        ) : (
          <EmptyState title={t('startNight.noSavedPlayers')} detail={t('startNight.noSavedPlayersDetail')} />
        )}
      </Panel>

      <Panel>
        <SectionHeading title={t('startNight.guests')} detail={t('startNight.guestsDetail')} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <TextInput
            value={guestName}
            onChange={(event) => setGuestName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAddGuest();
              }
            }}
            placeholder={t('startNight.guestName')}
            autoCapitalize="words"
            autoComplete="name"
            enterKeyHint="done"
          />
          <Button onClick={onAddGuest}>{t('startNight.addGuest')}</Button>
        </div>
        {guests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {guests.map((guest) => (
              <GuestChip key={guest.id} guest={guest} onRemove={() => onRemoveGuest(guest.id)} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function ReviewStep({ selectedPlayers, guests, setupStatus, flow, t }) {
  return (
    <Panel>
      <SectionHeading title={t('setup.reviewTitle')} detail={setupStatus.message} />
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricItem label={t('common.format')} value={flow.format === 'cup' ? t('common.cup') : t('common.league')} />
        <MetricItem label={t('common.players')} value={selectedPlayers.length + guests.length} />
        <MetricItem label={t('common.courts')} value={flow.courtCount} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {selectedPlayers.map((player) => (
          <Pill key={player.id} tone="greenSoft">{player.name}</Pill>
        ))}
        {guests.map((guest) => (
          <Pill key={guest.id}>{guest.name}</Pill>
        ))}
      </div>
      {!setupStatus.isValid && <InlineNotice tone="info" className="mt-4">{setupStatus.message}</InlineNotice>}
    </Panel>
  );
}

function SetupActions({ currentStep, setupStatus, isSaving, onBack, onNext, onStart, t }) {
  if (currentStep === 'participants') {
    return <Button className="w-full" size="lg" onClick={onNext}>{t('setup.nextFormat')}</Button>;
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
        {isSaving ? t('startNight.starting') : t('startNight.startTonight')}
      </Button>
    </div>
  );
}

function PlayerSelectRow({ player, selected, onClick, t }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`grid grid-cols-[32px_1fr_auto] items-center gap-3 rounded-lg border p-3 text-left transition ${
        selected ? 'border-club-green bg-club-green/12' : 'border-club-border bg-club-soft hover:bg-club-wash'
      }`}
    >
      <span className={`grid h-8 w-8 place-items-center rounded-md border transition ${selected ? 'border-club-green bg-club-green text-club-greenDeep' : 'border-club-borderStrong bg-club-surface text-transparent'}`}>
        <CheckIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-black text-club-ink">{player.name}</span>
        <span className="mt-0.5 block text-xs font-bold text-club-muted">
          {t('common.level')} {player.level} / {t('pool.rating', { rating: player.rating })}
        </span>
      </span>
      <span className="text-xs font-black uppercase tracking-wide text-club-muted">{selected ? t('common.in') : t('common.out')}</span>
    </button>
  );
}

function GuestChip({ guest, onRemove }) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-club-border bg-club-soft py-2 pl-3 pr-1 text-sm font-black text-club-ink">
      <span className="truncate">{guest.name}</span>
      <button type="button" onClick={onRemove} className="grid h-8 w-8 place-items-center rounded-md text-club-muted hover:bg-[#DB4145]/10 hover:text-[#DB4145]">
        <XIcon className="h-4 w-4" />
      </button>
    </span>
  );
}
