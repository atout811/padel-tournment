import SegmentedControl from './SegmentedControl.jsx';
import { Button, InlineNotice, Panel, Pill, SectionHeading } from './Ui.jsx';
import { ListIcon, TrophyIcon } from './Icons.jsx';

const steps = ['participants', 'format', 'review'];

export function SetupProgress({ currentStep, onStepChange, labels }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-lg bg-club-wash p-1" role="tablist" aria-label="Setup steps">
      {steps.map((step, index) => {
        const active = currentStep === step;
        return (
          <button
            key={step}
            type="button"
            onClick={() => onStepChange(step)}
            className={`min-h-10 rounded-md px-2 text-sm font-black transition ${
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

export function SetupSummary({ title, setupStatus, metrics, recommendation }) {
  return (
    <Panel>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-club-muted">{title}</p>
          <h3 className="mt-1 text-xl font-black leading-tight text-club-ink">
            {setupStatus.isValid ? 'Ready to play' : 'Build the night'}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-relaxed text-club-muted">{setupStatus.message}</p>
        </div>
        <Pill tone={setupStatus.isValid ? 'greenSoft' : 'default'}>
          {setupStatus.isValid ? 'Ready' : 'Needs players'}
        </Pill>
      </div>
      <p className="mt-3 truncate text-sm font-bold text-club-muted">
        {metrics.map((metric) => `${metric.value} ${metric.label}`).join(' / ')}
      </p>
      {recommendation && <p className="mt-2 text-xs font-semibold leading-relaxed text-club-muted">{recommendation}</p>}
    </Panel>
  );
}

export function SetupOptionsPanel({ flow, setupStatus, showScoring = false, t }) {
  return (
    <div className="space-y-3">
      <Panel>
        <SectionHeading title={t('setup.tournamentFormat')} detail={t('setup.formatHint')} />
        <div className="grid gap-2 sm:grid-cols-2">
          <FormatChoice
            title={t('common.league')}
            eyebrow={t('setup.leagueEyebrow')}
            description={t('setup.leagueDescription')}
            icon={<ListIcon className="h-5 w-5" />}
            selected={flow.format === 'league'}
            onClick={() => flow.setFormat('league')}
          />
          <FormatChoice
            title={t('common.cup')}
            eyebrow={t('setup.cupEyebrow')}
            description={t('setup.cupDescription')}
            icon={<TrophyIcon className="h-5 w-5" />}
            selected={flow.format === 'cup'}
            onClick={() => flow.setFormat('cup')}
          />
        </div>
        <InlineNotice tone={setupStatus.isValid ? 'green' : 'info'} className="mt-3">
          {setupStatus.message}
        </InlineNotice>
      </Panel>

      <SegmentedControl
        label={t('setup.courtsAvailable')}
        value={flow.courtCount}
        onChange={flow.setCourtCount}
        columns="grid-cols-3"
        options={[
          { value: 1, label: '1' },
          { value: 2, label: '2' },
          { value: 3, label: '3' },
        ]}
      />

      {showScoring && (
        <Panel>
          <Button tone="secondary" className="w-full justify-between" onClick={flow.toggleAdvanced}>
            {flow.showAdvanced ? t('setup.hideScoringOptions') : t('setup.scoringOptions')}
          </Button>

          {flow.showAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <FormatChoice
                  title={t('setup.classic')}
                  eyebrow={t('setup.classicEyebrow')}
                  description={t('setup.classicDescription')}
                  selected={flow.scoringPreset === 'standard'}
                  onClick={() => flow.applyPreset('standard')}
                />
                <FormatChoice
                  title={t('setup.quick')}
                  eyebrow={t('setup.quickEyebrow')}
                  description={t('setup.quickDescription')}
                  selected={flow.scoringPreset === 'fast'}
                  onClick={() => flow.applyPreset('fast')}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldSelect
                  id="maxSets"
                  label={t('setup.matchLength')}
                  value={flow.maxSets}
                  onChange={(event) => flow.setMaxSets(Number(event.target.value))}
                  options={[
                    { value: 1, label: 'Best of 1 set' },
                    { value: 3, label: 'Best of 3 sets' },
                    { value: 5, label: 'Best of 5 sets' },
                  ]}
                />
                <FieldSelect
                  id="deuceMode"
                  label={t('setup.deuceRule')}
                  value={flow.deuceMode}
                  onChange={(event) => flow.setDeuceMode(event.target.value)}
                  options={[
                    { value: 'advantage', label: 'Advantage at deuce' },
                    { value: 'golden', label: 'Golden point at deuce' },
                  ]}
                />
              </div>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

function FormatChoice({ title, eyebrow, description, icon, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-24 rounded-lg border p-3 text-left transition active:scale-[0.99] ${
        selected ? 'border-club-green bg-club-green/12' : 'border-club-border bg-club-soft hover:border-club-borderStrong hover:bg-club-wash'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <Pill tone={selected ? 'green' : 'default'}>{selected ? 'Selected' : eyebrow}</Pill>
        {icon && <span className={selected ? 'text-club-green' : 'text-club-muted'}>{icon}</span>}
      </div>
      <span className="mt-3 block text-lg font-black text-club-ink">{title}</span>
      <span className="mt-1 block text-sm font-semibold leading-relaxed text-club-muted">{description}</span>
    </button>
  );
}

function FieldSelect({ id, label, value, onChange, options }) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs font-black uppercase tracking-wide text-club-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="min-h-12 w-full rounded-lg border border-club-border bg-club-wash px-3 text-base font-bold text-club-ink outline-none focus:border-club-green focus:ring-4 focus:ring-club-green/20"
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
