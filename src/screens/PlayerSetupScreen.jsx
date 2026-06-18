import React, { useMemo, useState } from 'react';
import { createTournamentRecord } from '../utils/tournamentService';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import { buildTournament } from '../utils/tournamentBuilder';
import SegmentedControl from '../components/SegmentedControl.jsx';
import { CheckIcon, ListIcon, TrophyIcon, UsersIcon, XIcon } from '../components/Icons';
import { useI18n } from '../i18n/useI18n.js';

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const { t } = useI18n();
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [tournamentFormat, setTournamentFormat] = useState('cup');
  const [scoringPreset, setScoringPreset] = useState('standard');
  const [maxSets, setMaxSets] = useState(3);
  const [deuceMode, setDeuceMode] = useState('advantage');
  const [courtCount, setCourtCount] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activePanel, setActivePanel] = useState('players');

  const setupStatus = useMemo(() => getSetupStatus(players, tournamentFormat), [players, tournamentFormat]);
  const hasOddPlayer = players.length % 2 !== 0;

  const applyPreset = (preset) => {
    setScoringPreset(preset);
    if (preset === 'fast') {
      setMaxSets(1);
      setDeuceMode('golden');
    } else {
      setMaxSets(3);
      setDeuceMode('advantage');
    }
  };

  const handleAddPlayer = () => {
    const validation = validatePlayerName(playerName, players);
    if (!validation.isValid) {
      setPlayerError(validation.message);
      showAlert(t('setup.checkPlayerTitle'), validation.message);
      return;
    }

    setPlayers([...players, validation.name]);
    setPlayerName('');
    setPlayerError('');
  };

  const handleRemovePlayer = (nameToRemove) => {
    setPlayers(players.filter((player) => player !== nameToRemove));
    setPlayerError('');
  };

  const handleCreateTournament = async () => {
    const currentStatus = getSetupStatus(players, tournamentFormat);
    if (!currentStatus.isValid) {
      showAlert(t('setup.notReadyTitle'), currentStatus.message);
      return;
    }

    setIsSaving(true);

    const newTournament = buildTournament({
      players,
      format: tournamentFormat,
      scoringPreset,
      maxSets,
      deuceMode,
      courtCount,
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

  return (
    <div className="space-y-3 rounded-b-3xl border-x border-b border-club-border bg-[#07111B]/95 p-3 pb-24 shadow-xl shadow-club-greenDeep/5 backdrop-blur sm:p-6 sm:pb-6">
      <SetupBar players={players} setupStatus={setupStatus} courtCount={courtCount} hasOddPlayer={hasOddPlayer} tournamentFormat={tournamentFormat} t={t} />

      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 shadow-sm">
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-[#07111B] p-1">
          <TabButton active={activePanel === 'players'} onClick={() => setActivePanel('players')}>
            {t('setup.playersTab')}
          </TabButton>
          <TabButton active={activePanel === 'format'} onClick={() => setActivePanel('format')}>
            {t('setup.formatTab')}
          </TabButton>
          <TabButton active={activePanel === 'rules'} onClick={() => setActivePanel('rules')}>
            {t('setup.rulesTab')}
          </TabButton>
        </div>

        {activePanel === 'players' && (
          <div className="mt-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#F7F8F7]">{t('setup.playersTitle')}</h3>
                <p className="text-xs font-medium text-[#8D99A6]">{t('setup.playersHint', { count: setupStatus.minPlayers })}</p>
              </div>
              <span className="rounded-full bg-[#07111B] px-3 py-1 text-sm font-black text-[#BEDC45]">{players.length}</span>
            </div>

            <div className="grid grid-cols-[1fr_auto] gap-2">
              <div>
                <input
                  type="text"
                  className={`min-h-12 w-full rounded-2xl border bg-[#07111B] px-4 text-base font-semibold text-[#F7F8F7] outline-none transition placeholder:text-[#8D99A6] focus:ring-4 ${
                    playerError ? 'border-[#DB4145]/50 focus:border-[#DB4145] focus:ring-[#DB4145]/20' : 'border-[rgba(255,255,255,0.08)] focus:border-[#BEDC45] focus:ring-[#BEDC45]/20'
                  }`}
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
                      handleAddPlayer();
                    }
                  }}
                />
                {playerError && <p className="mt-2 text-sm font-bold text-[#DB4145]">{playerError}</p>}
              </div>
              <button
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#BEDC45] px-4 text-sm font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20 transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleAddPlayer}
                disabled={isSaving}
              >
                <UsersIcon className="h-4 w-4" />
                {t('common.add')}
              </button>
            </div>

            <div className="mt-3">
              {players.length > 0 ? (
                <div className="grid max-h-[42vh] gap-2 overflow-y-auto pr-1 sm:max-h-none sm:grid-cols-2">
                  {players.map((player, index) => (
                    <PlayerChip key={player} index={index + 1} name={player} onRemove={() => handleRemovePlayer(player)} disabled={isSaving} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[rgba(190,220,69,0.32)] bg-[#07111B] px-4 py-6 text-center">
                  <p className="text-base font-black text-[#F7F8F7]">{t('setup.noPlayers')}</p>
                  <p className="mt-1 text-xs font-medium text-[#8D99A6]">{t('setup.addNames')}</p>
                </div>
              )}
            </div>

            {hasOddPlayer && (
              <p className="mt-3 rounded-2xl bg-[#1F60D1]/16 px-3 py-2 text-xs font-bold text-[#CFD2D3]">
                {t('setup.oddPlayer')}
              </p>
            )}
          </div>
        )}

        {activePanel === 'format' && (
          <div className="mt-3 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-[#F7F8F7]">{t('setup.tournamentFormat')}</h3>
                <p className="mt-1 text-xs font-medium text-[#8D99A6]">{t('setup.formatHint')}</p>
              </div>
              <StatusPill ready={setupStatus.isValid} text={setupStatus.isValid ? 'Ready' : 'Needs players'} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <ChoiceCard
                title={t('common.cup')}
                eyebrow={t('setup.cupEyebrow')}
                description={t('setup.cupDescription')}
                icon={<TrophyIcon />}
                selected={tournamentFormat === 'cup'}
                onClick={() => setTournamentFormat('cup')}
                t={t}
              />
              <ChoiceCard
                title={t('common.league')}
                eyebrow={t('setup.leagueEyebrow')}
                description={t('setup.leagueDescription')}
                icon={<ListIcon />}
                selected={tournamentFormat === 'league'}
                onClick={() => setTournamentFormat('league')}
                t={t}
              />
            </div>
            <p className={`rounded-2xl px-3 py-2 text-xs font-bold ${setupStatus.isValid ? 'bg-[#BEDC45]/14 text-[#BEDC45]' : 'bg-[#19232B] text-[#BEDC45]'}`}>
              {setupStatus.message}
            </p>
          </div>
        )}

        {activePanel === 'rules' && (
          <div className="mt-3 space-y-3">
            <SegmentedControl
              label={t('setup.courtsAvailable')}
              value={courtCount}
              disabled={isSaving}
              onChange={setCourtCount}
              columns="grid-cols-3"
              options={[
                { value: 1, label: '1' },
                { value: 2, label: '2' },
                { value: 3, label: '3' },
              ]}
            />

            <button
              type="button"
              onClick={() => setShowAdvanced((value) => !value)}
              className="min-h-12 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-4 text-left text-sm font-black text-[#F7F8F7] transition hover:bg-[#0D1823]"
            >
              {showAdvanced ? t('setup.hideScoringOptions') : t('setup.scoringOptions')}
            </button>

            {showAdvanced && (
              <div className="space-y-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] p-3">
                <div className="grid gap-2 sm:grid-cols-2">
            <ChoiceCard
              title={t('setup.classic')}
              eyebrow={t('setup.classicEyebrow')}
              description={t('setup.classicDescription')}
              selected={scoringPreset === 'standard'}
              onClick={() => applyPreset('standard')}
              t={t}
            />
            <ChoiceCard
              title={t('setup.quick')}
              eyebrow={t('setup.quickEyebrow')}
              description={t('setup.quickDescription')}
              selected={scoringPreset === 'fast'}
              onClick={() => applyPreset('fast')}
              t={t}
            />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FieldSelect
                    id="maxSets"
                    label={t('setup.matchLength')}
                    value={maxSets}
                    disabled={isSaving}
                    onChange={(event) => {
                      setMaxSets(Number(event.target.value));
                      setScoringPreset('custom');
                    }}
                    options={[
                      { value: 1, label: 'Best of 1 set' },
                      { value: 3, label: 'Best of 3 sets' },
                      { value: 5, label: 'Best of 5 sets' },
                    ]}
                  />
                  <FieldSelect
                    id="deuceMode"
                    label={t('setup.deuceRule')}
                    value={deuceMode}
                    disabled={isSaving}
                    onChange={(event) => {
                      setDeuceMode(event.target.value);
                      setScoringPreset('custom');
                    }}
                    options={[
                      { value: 'advantage', label: 'Advantage at deuce' },
                      { value: 'golden', label: 'Golden point at deuce' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#07111B]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl shadow-[#020D16]/15 backdrop-blur sm:sticky sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-3xl sm:border">
        <button
          className="min-h-14 w-full rounded-2xl bg-[#BEDC45] px-4 text-lg font-black text-[#020D16] shadow-lg shadow-[#BEDC45]/20 transition hover:bg-[#D3F05A] disabled:cursor-not-allowed disabled:bg-[rgba(255,255,255,0.08)] disabled:text-[#8D99A6] disabled:shadow-none"
          onClick={handleCreateTournament}
          disabled={isSaving || !setupStatus.isValid}
        >
          {isSaving ? t('setup.creating') : t('setup.startTournament')}
        </button>
      </div>
    </div>
  );
}

function SetupBar({ players, setupStatus, courtCount, hasOddPlayer, tournamentFormat, t }) {
  return (
    <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.18em] text-[#BEDC45]">{t('setup.createTournament')}</p>
          <h2 className="truncate text-lg font-black leading-tight text-[#F7F8F7]">{tournamentFormat === 'league' ? t('setup.leagueNight') : t('setup.cupNight')}</h2>
        </div>
        <StatusPill ready={setupStatus.isValid} text={setupStatus.isValid ? t('common.ready') : t('common.needsPlayers')} />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <MiniStat label={t('common.players')} value={players.length} detail={`${setupStatus.minPlayers}+`} />
        <MiniStat label={t('common.teams')} value={setupStatus.teamCount} detail={hasOddPlayer ? 'sub' : 'paired'} />
        <MiniStat label={t('common.courts')} value={courtCount} detail={courtCount === 1 ? 'court' : 'courts'} />
      </div>
    </section>
  );
}

function MiniStat({ label, value, detail }) {
  return (
    <div className="rounded-xl bg-[#07111B] px-2 py-2 text-center">
      <p className="text-base font-black tabular-nums text-[#F7F8F7]">{value}</p>
      <p className="truncate text-[0.62rem] font-bold uppercase tracking-wide text-[#8D99A6]">{label}</p>
      <p className="truncate text-[0.62rem] font-bold text-[#BEDC45]">{detail}</p>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-xl px-2 text-sm font-black transition ${
        active ? 'motion-soft-pop bg-[#BEDC45] text-[#020D16]' : 'text-[#8D99A6] hover:bg-[#0A141E] hover:text-[#F7F8F7]'
      }`}
    >
      {children}
    </button>
  );
}

function StatusPill({ ready, text }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${ready ? 'bg-[#BEDC45]/14 text-[#BEDC45]' : 'bg-[#19232B] text-[#BEDC45]'}`}>
      {text}
    </span>
  );
}

function ChoiceCard({ title, eyebrow, description, icon, selected, onClick, t }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative min-h-24 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${
        selected ? 'border-[#BEDC45] bg-[#BEDC45]/14 shadow-[0_0_0_4px_rgba(22,138,91,0.12)]' : 'border-[rgba(255,255,255,0.08)] bg-[#0A141E] hover:border-[rgba(190,220,69,0.32)] hover:bg-[#07111B]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black uppercase tracking-wide ${selected ? 'bg-[#BEDC45] text-[#020D16]' : 'bg-[#07111B] text-[#8D99A6]'}`}>
          {selected ? t('common.ready') : eyebrow}
        </span>
        {icon && <span className={`grid h-9 w-9 place-items-center rounded-xl ${selected ? 'bg-[#0A141E] text-[#BEDC45]' : 'bg-[#07111B] text-[#8D99A6]'}`}>{icon}</span>}
      </div>
      <span className="mt-2 flex items-center gap-2 text-lg font-black text-[#F7F8F7]">
        {selected && <CheckIcon className="h-4 w-4 text-[#BEDC45]" />}
        {title}
      </span>
      <span className="mt-1 block text-xs font-semibold leading-relaxed text-[#8D99A6]">{description}</span>
    </button>
  );
}

function PlayerChip({ index, name, onRemove, disabled }) {
  return (
    <div className="flex max-w-full items-center gap-2 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0D1823] py-1.5 pl-2 pr-1 shadow-sm">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#BEDC45] text-xs font-black text-[#020D16]">{getInitials(name) || index}</span>
      <span className="min-w-0 truncate text-sm font-black text-[#F7F8F7]">{name}</span>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${name}`}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-[#8D99A6] transition hover:bg-[#DB4145]/10 hover:text-[#DB4145] disabled:cursor-not-allowed disabled:opacity-60"
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


function FieldSelect({ id, label, value, disabled, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-black uppercase tracking-wide text-[#8D99A6]">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="min-h-12 w-full rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#07111B] px-3 text-base font-bold text-[#F7F8F7] outline-none focus:border-[#BEDC45] focus:ring-4 focus:ring-[#BEDC45]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
