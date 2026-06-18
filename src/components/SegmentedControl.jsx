import React from 'react';

export default function SegmentedControl({ label, value, options, onChange, disabled = false, columns = 'grid-cols-2' }) {
  return (
    <div className="rounded-3xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3 shadow-sm">
      {label && (
        <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#8D99A6]">
          {label}
        </p>
      )}
      <div className={`grid ${columns} gap-1 rounded-2xl bg-[#07111B] p-1`} role="group" aria-label={label}>
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
                active ? 'motion-soft-pop bg-[#BEDC45] text-[#020D16]' : 'text-[#8D99A6] hover:bg-[#0A141E] hover:text-[#F7F8F7]'
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
