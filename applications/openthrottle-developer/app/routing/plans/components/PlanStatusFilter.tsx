import type { FacetedFilterOption } from '@openthrottle/react-router-shadcn';
import { cn, FacetedFilter } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  DEFAULT_STATUSES,
  isAllStatusSelection,
  isDefaultStatusSelection,
  STATUS_OPTIONS,
} from '~/routing/plans/config/status-options';
import { PLAN_STATUS_FILTER_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_STATUS_DOT_COLOR } from '~/routing/plans/data/data.plan-status-dot-color';
import { PLAN_STATUS_FILTER_GROUPS } from '~/routing/plans/data/data.plan-status-filter-groups';
import { planStatusValues } from '~/routing/plans/types';

export interface PlanStatusFilterProps {
  readonly className?: string;
  readonly onChange: (value: string[]) => void;
  readonly value: readonly string[];
}

/**
 * @description The plans index Status filter: a {@link FacetedFilter} over the
 * plan statuses, grouped Active / Resolved, each row carrying the status dot
 * the table uses. Footer actions select the defaults or every status; the
 * caller maps either selection to its URL (`usePlansToolbar`).
 */
export const PlanStatusFilter = (
  props: PlanStatusFilterProps,
): React.ReactElement => {
  const { className, onChange, value } = props;

  // Hooks

  // Setup
  const options: FacetedFilterOption[] = PLAN_STATUS_FILTER_GROUPS.flatMap(
    (group) =>
      group.statuses.map((status) => ({
        adornment: (
          <span
            aria-hidden={true}
            className={cn(
              'size-2 shrink-0 rounded-full',
              PLAN_STATUS_DOT_COLOR[status],
            )}
          />
        ),
        count: undefined,
        group: group.heading,
        label: planStatusValues[status],
        value: status,
      })),
  );

  // Handlers
  const handleReset = (): void => {
    onChange([...DEFAULT_STATUSES]);
  };

  const handleSelectAll = (): void => {
    onChange([...STATUS_OPTIONS]);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <FacetedFilter
      className={className}
      footerActions={[
        {
          disabled: isDefaultStatusSelection(value),
          label: PLAN_STATUS_FILTER_COPY.resetToDefaults,
          onSelect: handleReset,
        },
        {
          disabled: isAllStatusSelection(value),
          label: PLAN_STATUS_FILTER_COPY.allStatuses,
          onSelect: handleSelectAll,
        },
      ]}
      maxBadges={2}
      onChange={onChange}
      options={options}
      searchable={false}
      title={PLAN_STATUS_FILTER_COPY.title}
      value={value}
    />
  );
};
