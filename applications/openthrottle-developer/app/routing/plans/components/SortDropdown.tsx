import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import type { PlansSortBy, PlansSortOrder } from '~/routing/plans/config/types';
import { PLANS_SORT_BY_OPTIONS } from '~/routing/plans/config/types';
import {
  isPlansSortBy,
  isPlansSortOrder,
} from '~/routing/plans/utils/plans-sort';

export interface SortDropdownProps {
  onChange: (sortBy: PlansSortBy, sortOrder: PlansSortOrder) => void;
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
}

/**
 * @description Single dropdown to sort plans (combines sortBy and sortOrder). Matches OpenThrottle API SortDropdown: value (sortBy + sortOrder), onChange(sortBy, sortOrder).
 */
export const SortDropdown = (props: SortDropdownProps): React.ReactElement => {
  const { onChange, sortBy, sortOrder } = props;

  // Hooks

  // Setup
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PLANS_SORT_BY_OPTIONS.some((o) => o.value === value)
    ? value
    : 'createdAt-desc';

  // Handlers
  const handleChange = React.useCallback(
    (value: string) => {
      const [by, order] = value.split('-');

      if (
        by !== undefined &&
        order !== undefined &&
        isPlansSortBy(by) &&
        isPlansSortOrder(order)
      ) {
        onChange(by, order);
      }
    },

    [onChange],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select onValueChange={handleChange} value={resolvedValue}>
      <SelectTrigger
        aria-label="Sort plans"
        className="w-[200px]"
        data-testid="PlansSortDropdown"
      >
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {PLANS_SORT_BY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
