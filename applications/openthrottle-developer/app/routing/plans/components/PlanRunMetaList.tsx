import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { PLAN_RUN_TRANSPARENCY_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_RUN_META_FIELDS } from '~/routing/plans/data/data.plan-run-history';
import type { PlanRunMetaItem } from '~/routing/plans/utils/plan-run-sections';

export interface PlanRunMetaListProps {
  readonly className?: string;
  readonly items: readonly PlanRunMetaItem[];
}

/**
 * @description A run's "model · effort · backend · workspace" line for the Runs card. Items stack
 * one per line on narrow screens and run inline, dot-separated, from `sm` up. The workspace path is
 * monospaced and truncates, with the full path on hover. Renders nothing for no items.
 */
export const PlanRunMetaList = (
  props: PlanRunMetaListProps,
): React.ReactElement | null => {
  const { className, items } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup
  const listItems = items.map((item, index) => {
    const isWorkspace = item.field === PLAN_RUN_META_FIELDS.workspace;

    return (
      <li
        className={cn('flex min-w-0 items-center gap-2', {
          'font-mono': isWorkspace,
        })}
        data-field={item.field}
        key={item.field}
        title={isWorkspace ? item.value : undefined}
      >
        {index > 0 ? (
          <span aria-hidden={true} className="hidden sm:inline">
            ·
          </span>
        ) : null}
        <span className="truncate">{item.value}</span>
      </li>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (items.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={PLAN_RUN_TRANSPARENCY_COPY.meta.ariaLabel}
      className={cn(
        'text-muted-foreground flex min-w-0 flex-col gap-0.5 text-xs sm:flex-row sm:flex-wrap sm:gap-x-2',
        className,
      )}
      data-testid="PlanRunMetaList"
    >
      {listItems}
    </ul>
  );
};
