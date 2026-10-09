import { useMemo, useState } from 'react';
import { createTournamentRecord } from '../utils/tournamentService';
import { getSetupStatus, validatePlayerName } from '../utils/tournamentRules';
import { buildTournament } from '../utils/tournamentBuilder';
import { Button, TextInput } from '../components/Ui.jsx';
import { SetupOptionsPanel } from '../components/NightSetupFlow.jsx';
import { DEFAULT_SCORING_SETTINGS } from '../utils/padelScoring';
import { useNightSetupFlow } from '../hooks/useNightSetupFlow.js';
import { forgetPlayerName, loadSavedPlayerNames, rememberPlayerNames } from '../utils/storage';
import { useI18n } from '../i18n/useI18n.js';
import PadelArtwork from '../components/PadelArtwork.jsx';
import SavedPlayerNames from '../components/SavedPlayerNames.jsx';

export default function PlayerSetupScreen({ showAlert, setTournament, setScreen }) {
  const { t, isRtl } = useI18n();
  const copy = (ar, en) => isRtl ? ar : en;
  const [players, setPlayers] = useState([]);
  const [savedNames, setSavedNames] = useState(loadSavedPlayerNames);
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const flow = useNightSetupFlow({ participantCount: players.length });
  const setupStatus = useMemo(() => getSetupStatus(players, flow.format, t), [players, flow.format, t]);
  const addPlayer = () => {
    const validation = validatePlayerName(playerName, players, t);
    if (!validation.isValid) { setPlayerError(validation.message); return; }
    setPlayers((current) => [...current, validation.name]);
    setSavedNames(rememberPlayerNames([validation.name]));
    setPlayerName(''); setPlayerError('');
  };
  const start = async () => {
    if (isSaving || !setupStatus.isValid) return;
    setIsSaving(true);
    try {
      const created = await createTournamentRecord(buildTournament({ players, format: flow.format, scoringPreset: 'standard', maxSets: DEFAULT_SCORING_SETTINGS.maxSets, deuceMode: DEFAULT_SCORING_SETTINGS.deuceMode, courtCount: flow.courtCount }));
      setTournament(created); setScreen('tournament');
    } catch (error) { console.error(error); showAlert(t('alerts.error'), t('setup.saveError')); }
    finally { setIsSaving(false); }
  };
  const togglePlayer = (name) => {
    setPlayers((current) => current.some((player) => player.toLowerCase() === name.toLowerCase()) ? current.filter((player) => player.toLowerCase() !== name.toLowerCase()) : [...current, name]);
    setPlayerError('');
  };
  return <section className="play-studio">
    <div className="studio-intro">
      <PadelArtwork className="hero-rackets" />
      <div className="studio-kicker"><span />{copy('الملعب مستنيكم', 'LESS SETUP. MORE PADEL.')}</div>
      <h2>{copy('لمّ الشلة، ويلا!', 'Let’s play padel.')}</h2>
      <p>{copy('هنلعب إيه؟ ظبّطها، وقولنا مين هيلعب.', 'Pick your format, add your friends, and play.')}</p>
      <span className="hero-sticker" aria-hidden="true">PLAY / REPEAT ↗</span>
    </div>
    <div className="lineup-sheet">
      <div className="sheet-heading"><div><p>{copy('كله جاهز؟', 'YOUR NEXT MATCH')}</p><h3>{copy('مين هيلعب؟', 'Who’s in?')}</h3></div><button type="button" onClick={() => setScreen('history')} className="history-link">{t('nav.history')} ↗</button></div>
      <fieldset disabled={isSaving} className="setup-controls"><SetupOptionsPanel flow={flow} setupStatus={setupStatus} t={t} /></fieldset>
      <form className="name-form" onSubmit={(event) => { event.preventDefault(); addPlayer(); }}>
        <TextInput aria-label={t('setup.playerName')} placeholder={copy('اكتب اسم لاعب…', 'Type a player’s name…')} value={playerName} maxLength={28} autoComplete="off" disabled={isSaving} invalid={Boolean(playerError)} onChange={(event) => { setPlayerName(event.target.value); setPlayerError(''); }} />
        <Button type="submit" disabled={isSaving} aria-label={t('common.add')} className="shrink-0">+</Button>
      </form>
      {playerError && <p role="alert" className="mt-2 text-sm text-red-600">{playerError}</p>}
      <SavedPlayerNames names={savedNames} players={players} disabled={isSaving} onToggle={togglePlayer} onForget={(name) => setSavedNames(forgetPlayerName(name))} />
      <div className="today-lineup"><div className="field-caption">{copy('شلة النهارده', 'THE LINEUP')}<span className="lineup-count">{players.length} {t('common.players')}</span></div>
        {players.length ? <div className="lineup-list">{players.map((name,index) => <div className="lineup-row" key={name}><span className="player-number">{String(index + 1).padStart(2,'0')}</span><span className="player-label">{name}</span><button type="button" disabled={isSaving} aria-label={copy(`شيل ${name}`, `Remove ${name}`)} onClick={() => togglePlayer(name)}>×</button></div>)}</div> : <div className="lineup-empty"><div aria-hidden="true">＋ ＋ ＋ ＋</div><p>{copy('لسه مستنيين الشلة!', 'Save a spot for your friends.')}</p><span>{copy('هات ٤ لاعيبة على الأقل، ويلا بينا.', 'Add at least 4 players to get started.')}</span></div>}
      </div>
      <Button size="lg" className="start-playing w-full" onClick={start} disabled={isSaving || !setupStatus.isValid}>{isSaving ? t('setup.creating') : copy('يلا نلعب', 'Let’s play')}<span aria-hidden="true">{isRtl ? '←' : '→'}</span></Button>
      <p className="setup-status" aria-live="polite">{setupStatus.message}</p>
    </div>
  </section>;
}
