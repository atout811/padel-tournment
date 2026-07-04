import React from 'react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const buttonTones = {
  primary: 'bg-club-green text-club-greenDeep hover:bg-club-greenDark disabled:bg-club-soft disabled:text-club-muted',
  secondary: 'border border-club-border bg-club-soft text-club-ink hover:border-club-borderStrong hover:bg-club-wash',
  quiet: 'text-club-muted hover:bg-club-soft hover:text-club-ink',
  danger: 'border border-[#DB4145]/35 bg-[#DB4145]/10 text-[#DB4145] hover:bg-[#DB4145]/20',
  blue: 'border border-club-border bg-club-soft text-club-ink hover:border-club-borderStrong hover:bg-club-wash',
  whatsapp: 'bg-[#25D366] text-[#062D16] hover:bg-[#41E37D]',
};

export function ScreenShell({ children, withBottomNav = false, className = '' }) {
  return (
    <div
      className={cn(
        'min-h-[calc(100dvh-4rem)] bg-club-bg px-4 py-4 sm:px-6 sm:py-5',
        withBottomNav ? 'pb-24 sm:pb-5' : '',
        className
      )}
    >
      <div className="mx-auto w-full max-w-5xl space-y-4">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, detail, meta, actions, className = '' }) {
  return (
    <section className={cn('pb-2', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-black uppercase tracking-wide text-club-muted">{eyebrow}</p>}
          <h2 className="mt-1 break-words text-2xl font-black leading-tight text-club-ink sm:text-3xl">{title}</h2>
          {detail && <p className="mt-1 max-w-2xl text-sm font-semibold leading-relaxed text-club-muted">{detail}</p>}
          {meta && <div className="mt-3 flex flex-wrap gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </section>
  );
}

export function Panel({ children, className = '', as = 'section' }) {
  const Tag = as;
  return (
    <Tag className={cn('rounded-lg border border-club-border bg-club-surface p-4', className)}>
      {children}
    </Tag>
  );
}

export function SectionHeading({ title, detail, count, actions }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-black leading-tight text-club-ink">{title}</h3>
        {detail && <p className="mt-1 text-sm font-semibold leading-relaxed text-club-muted">{detail}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {count !== undefined && <Pill>{count}</Pill>}
        {actions}
      </div>
    </div>
  );
}

export function Pill({ children, tone = 'default', className = '' }) {
  const tones = {
    default: 'bg-club-soft text-club-muted',
    green: 'bg-club-green/14 text-club-green',
    greenSoft: 'bg-club-green/12 text-club-green',
    blue: 'bg-club-soft text-club-muted',
    danger: 'bg-[#DB4145]/10 text-[#DB4145]',
  };

  return (
    <span className={cn('inline-flex min-h-7 max-w-full items-center rounded-md px-2.5 text-xs font-black uppercase tracking-wide', tones[tone], className)}>
      <span className="truncate">{children}</span>
    </span>
  );
}

export function Button({ children, tone = 'primary', size = 'md', className = '', ...props }) {
  const sizes = {
    sm: 'min-h-10 px-3 text-sm',
    md: 'min-h-12 px-4 text-sm',
    lg: 'min-h-14 px-5 text-base',
  };

  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70',
        buttonTones[tone] || buttonTones.primary,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TextInput({ className = '', invalid = false, ...props }) {
  return (
    <input
      className={cn(
        'min-h-12 w-full rounded-lg border bg-club-wash px-3 text-base font-semibold text-club-ink outline-none transition placeholder:text-club-muted focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60',
        invalid ? 'border-[#DB4145]/50 focus:border-[#DB4145] focus:ring-[#DB4145]/20' : 'border-club-border focus:border-club-green focus:ring-club-green/20',
        className
      )}
      {...props}
    />
  );
}

export function MetricGrid({ children, columns = 3, className = '' }) {
  const gridColumns = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-2', gridColumns[columns] || gridColumns[3], className)}>
      {children}
    </div>
  );
}

export function MetricItem({ label, value, detail, icon }) {
  return (
    <div className="min-w-0 rounded-lg bg-club-wash px-3 py-2">
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0 text-club-muted">{icon}</span>}
        <p className="truncate text-xs font-black uppercase tracking-wide text-club-muted">{label}</p>
      </div>
      <p className="mt-1 truncate text-xl font-black tabular-nums text-club-ink">{value}</p>
      {detail && <p className="mt-0.5 truncate text-xs font-bold text-club-muted">{detail}</p>}
    </div>
  );
}

export function EmptyState({ title, detail, action, className = '' }) {
  return (
    <div className={cn('rounded-lg border border-dashed border-club-borderStrong bg-club-wash px-4 py-7 text-center', className)}>
      <p className="text-base font-black text-club-ink">{title}</p>
      {detail && <p className="mx-auto mt-1 max-w-sm text-sm font-semibold leading-relaxed text-club-muted">{detail}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ListButton({ icon, title, detail, meta, actionIcon, className = '', ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'grid min-h-16 w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-lg border border-club-border bg-club-surface p-3 text-left transition hover:border-club-borderStrong hover:bg-club-soft active:scale-[0.99]',
        className
      )}
      {...props}
    >
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-club-wash text-club-muted">{icon}</span>
      <span className="min-w-0">
        <span className="block truncate text-base font-black text-club-ink">{title}</span>
        {detail && <span className="mt-0.5 block truncate text-sm font-semibold text-club-muted">{detail}</span>}
        {meta && <span className="mt-2 flex flex-wrap gap-1.5">{meta}</span>}
      </span>
      {actionIcon && <span className="grid h-9 w-9 place-items-center rounded-lg bg-club-wash text-club-ink">{actionIcon}</span>}
    </button>
  );
}

export function BottomActionBar({ children, className = '' }) {
  return (
    <div className={cn('fixed inset-x-0 bottom-0 z-40 border-t border-club-border bg-club-wash/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-2xl shadow-club-shadow/20 backdrop-blur sm:sticky sm:bottom-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-lg sm:border', className)}>
      <div className="mx-auto grid w-full max-w-5xl gap-2">{children}</div>
    </div>
  );
}

export function InlineNotice({ children, tone = 'info', className = '' }) {
  const tones = {
    info: 'border-club-border bg-club-wash text-club-muted',
    green: 'border-club-borderStrong bg-club-green/10 text-club-green',
    blue: 'border-club-border bg-club-soft text-club-muted',
    danger: 'border-[#DB4145]/35 bg-[#DB4145]/10 text-[#DB4145]',
  };

  return <p className={cn('rounded-lg border px-3 py-2 text-sm font-bold leading-relaxed', tones[tone], className)}>{children}</p>;
}
