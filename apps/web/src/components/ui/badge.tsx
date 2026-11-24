import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { AssetStatus } from '@proofline/shared';
import { cn } from '../../lib/utils.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors select-none font-mono tabular-nums',
  {
    variants: {
      variant: {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
        IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
        CHANGES_REQUESTED: 'bg-rose-50 text-rose-700 border-rose-200',
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        ARCHIVED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
        ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        COMPLETED: 'bg-slate-100 text-slate-700 border-slate-200',
        outline: 'border-slate-200 text-slate-700 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const dotColors: Record<string, string> = {
  DRAFT: 'bg-slate-400',
  IN_REVIEW: 'bg-amber-500',
  CHANGES_REQUESTED: 'bg-rose-500',
  APPROVED: 'bg-emerald-500',
  ARCHIVED: 'bg-zinc-400',
  ACTIVE: 'bg-emerald-500',
  COMPLETED: 'bg-slate-400',
};

const labelDisplay: Record<string, string> = {
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  CHANGES_REQUESTED: 'Changes Requested',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  status?: AssetStatus | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  showDot?: boolean;
}

export function Badge({
  className,
  variant,
  status,
  showDot = true,
  children,
  ...props
}: BadgeProps) {
  const activeVariant = status ? (status as VariantProps<typeof badgeVariants>['variant']) : variant;
  const dotColor = status ? dotColors[status] : undefined;
  const displayLabel = children ?? (status ? labelDisplay[status] || status : null);

  return (
    <div
      className={cn(badgeVariants({ variant: activeVariant }), className)}
      {...props}
    >
      {showDot && dotColor && (
        <span
          data-testid="badge-dot"
          className={cn('h-1.5 w-1.5 rounded-full shrink-0', dotColor)}
        />
      )}
      <span>{displayLabel}</span>
    </div>
  );
}

export { badgeVariants };
