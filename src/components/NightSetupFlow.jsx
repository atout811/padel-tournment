import { Panel, Pill } from './Ui.jsx';

const steps = ['participants', 'format', 'review'];

export function SetupProgress({ currentStep, onStepChange, labels }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-club-wash p-1" role="tablist" aria-label="Setup steps">
      {steps.map((step, index) => {
        const active = currentStep === step;
        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange(step)}
            className={`min-h-10 rounded-xl px-2 text-sm font-black transition ${
              active ? 'motion-soft-pop bg-club-green text-club-greenDeep' : 'text-club-muted hover:bg-club-soft hover:text-club-ink'
            }`}
          >
            <span className="mr-1 text-xs opacity-70">{index + 1}</span>
            {labels?.[step] || step}
          </button>
        );
      })}
    </div>
  );
}

export function SetupSummary({ title, setupStatus, metrics, recommendation, t }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{title}</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-club-ink">
            {setupStatus.isValid ? t('setup.readyToPlay') : t('setup.buildNight')}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-club-muted">{setupStatus.message}</p>
        </div>
        <Pill tone={setupStatus.isValid ? 'greenSoft' : 'default'}>
          {setupStatus.isValid ? t('common.ready') : t('common.needsPlayers')}
        </Pill>
      </div>
      <p className="mt-3 truncate text-sm font-bold text-club-muted">
        {metrics.map((metric) => `${metric.value} ${metric.label}`).join(' / ')}
      </p>
      {recommendation && <p className="mt-2 text-xs font-semibold leading-relaxed text-club-muted">{recommendation}</p>}
    </Panel>
  );
}

export function SetupOptionsPanel({ flow, setupStatus, t }) {
  return <div className="compact-settings">
    <div className="settings-field"><span className="field-caption">{t('common.format')}</span><div className="settings-segments" role="group" aria-label={t('common.format')}>
      {['league', 'cup'].map((format) => <button type="button" key={format} aria-pressed={flow.format === format} onClick={() => flow.setFormat(format)}>{t('common.' + format)}</button>)}
    </div></div>
    <div className="settings-field"><span className="field-caption">{t('common.courts')}</span><div className="settings-segments" role="group" aria-label={t('common.courts')}>
      {[1,2,3].map((count) => <button type="button" key={count} aria-pressed={flow.courtCount === count} onClick={() => flow.setCourtCount(count)}>{count}</button>)}
    </div></div>
    <p className="settings-hint">{flow.format === 'cup' ? t('setup.cupEyebrow') : t('setup.leagueEyebrow')} · {setupStatus.minPlayers}+ {t('common.players')} · {t('setup.classic')}</p>
  </div>;
}
