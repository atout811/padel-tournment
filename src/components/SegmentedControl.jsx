import React from 'react';

export default function SegmentedControl({ label, value, options, onChange, disabled = false, columns = 'grid-cols-2' }) {
  return (
    <div className="rounded-2xl border border-club-border bg-club-surface p-3 shadow-sm">
      {label && (
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-club-muted">
          {label}
        </p>
      )}
      <div className={`grid ${columns} gap-1 rounded-2xl bg-club-wash p-1`} role="group" aria-label={label}>
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              disabled={disabled}
              aria-pressed={active}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                active ? 'motion-soft-pop bg-club-green text-club-greenDeep' : 'text-club-muted hover:bg-club-soft hover:text-club-ink'
              }`}
            >
              {option.icon && <span className="h-4 w-4">{option.icon}</span>}
              <span className="truncate">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
