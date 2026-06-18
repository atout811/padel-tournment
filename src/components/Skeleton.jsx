import React from 'react';

export function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-[#0D1823] ${className}`} aria-hidden="true" />;
}

export function SkeletonRows({ count = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`} aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={`skeleton-row-${index}`} className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[#0A141E] p-3">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-12 w-12 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
