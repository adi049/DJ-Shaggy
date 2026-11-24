import { ReactNode } from 'react';
import { cx } from '../lib/utils';
import Eq from './Eq';

export function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24" role="status" aria-live="polite">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-line" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-gold spin-slow" style={{ animationDuration: '1.2s' }} />
        <div className="absolute inset-[38%] rounded-full bg-gold" />
      </div>
      <p className="text-xs uppercase tracking-[0.25em] text-muted">{label}</p>
    </div>
  );
}

export function PageHeader({
  eyebrow, title, sub,
}: { eyebrow?: string; title: ReactNode; sub?: string }) {
  return (
    <div className="relative overflow-hidden border-b border-line bg-coal noise">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        {eyebrow && (
          <div className="mb-3 flex items-center gap-3">
            <Eq bars={4} height={14} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
          </div>
        )}
        <h1 className="font-display text-3xl font-bold sm:text-5xl">{title}</h1>
        {sub && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">{sub}</p>}
      </div>
      <div className="gold-line" />
    </div>
  );
}

export function SkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 xl:grid-cols-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-line bg-panel">
          <div className="skeleton aspect-square" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-4 w-4/5 rounded" />
            <div className="flex items-center justify-between pt-1">
              <div className="skeleton h-5 w-14 rounded" />
              <div className="skeleton h-8 w-16 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-panel/50 px-6 py-16 text-center">
      <Eq bars={7} height={26} color="#3a3a42" animated={false} />
      <p className="font-display text-lg font-semibold text-silver">{title}</p>
      {sub && <p className="max-w-md text-sm text-muted">{sub}</p>}
      {action}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  'Pending Verification': 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  Verified: 'border-azure/40 bg-azure/10 text-azure',
  Rejected: 'border-crimson/40 bg-crimson/10 text-crimson',
  'On Hold': 'border-orange-400/40 bg-orange-400/10 text-orange-300',
  Delivered: 'border-jade/40 bg-jade/10 text-jade',
  published: 'border-jade/40 bg-jade/10 text-jade',
  draft: 'border-line bg-panel2 text-muted',
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cx(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
      STATUS_STYLES[status] || 'border-line bg-panel2 text-muted',
      className
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function SectionHead({ eyebrow, title, sub, right }: {
  eyebrow: string; title: ReactNode; sub?: string; right?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 sm:mb-10">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <Eq bars={4} height={13} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold">{eyebrow}</span>
        </div>
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
        {sub && <p className="mt-2 max-w-xl text-sm text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
