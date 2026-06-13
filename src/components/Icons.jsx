const baseClass = 'h-5 w-5';

function IconBase({ children, className = baseClass, viewBox = '0 0 24 24' }) {
  return (
    <svg className={className} viewBox={viewBox} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export function TrophyIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M5 5H3v3a4 4 0 0 0 4 4" />
      <path d="M19 5h2v3a4 4 0 0 1-4 4" />
    </IconBase>
  );
}

export function CourtIcon({ className }) {
  return (
    <IconBase className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 12h16" />
      <path d="M12 3v18" />
      <path d="M8 12v4" />
      <path d="M16 8v4" />
    </IconBase>
  );
}

export function ShareIcon({ className }) {
  return (
    <IconBase className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.6 6.8-4.2" />
      <path d="m8.6 13.4 6.8 4.2" />
    </IconBase>
  );
}

export function TrashIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m6 6 1 15h10l1-15" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </IconBase>
  );
}

export function XIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function CheckIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M20 6 9 17l-5-5" />
    </IconBase>
  );
}

export function UsersIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function ListIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </IconBase>
  );
}

export function SparkIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="M12 2 9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5L12 2Z" />
    </IconBase>
  );
}

export function ArrowLeftIcon({ className }) {
  return (
    <IconBase className={className}>
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </IconBase>
  );
}
