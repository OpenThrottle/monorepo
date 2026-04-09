import * as React from 'react';
import {
  PLANS_SORT_BY_OPTIONS,
  PlansSortBy,
  PlansSortOrder,
} from '~/routing/plans/config/types';

export interface SortDropdownProps {
  readonly onChange: (sortBy: PlansSortBy, sortOrder: PlansSortOrder) => void;
  readonly sortBy: PlansSortBy;
  readonly sortOrder: PlansSortOrder;
}

/**
 * @description Single dropdown to sort plans (combines sortBy and sortOrder). Matches OpenThrottle API SortDropdown: value (sortBy + sortOrder), onChange(sortBy, sortOrder).
 */
export function SortDropdown(props: SortDropdownProps): React.JSX.Element {
  const { sortBy, sortOrder, onChange } = props;

  // Hooks

  // Setup
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PLANS_SORT_BY_OPTIONS.some((o) => o.value === value)
    ? value
    : 'createdAt-desc';

  // Handlers
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [by, order] = e.target.value.split('-') as [
        PlansSortBy,
        PlansSortOrder,
      ];

      onChange(by, order);
    },

    [onChange],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <select
      aria-label="Sort plans"
      className="rounded-md border border-input px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[11rem] shrink-0"
      onChange={handleChange}
      value={resolvedValue}
    >
      {PLANS_SORT_BY_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
