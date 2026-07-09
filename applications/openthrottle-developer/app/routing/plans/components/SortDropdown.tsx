import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import {
  PLANS_SORT_BY_OPTIONS,
  PLANS_SORT_ORDER,
  PlansSortBy,
  PlansSortOrder,
} from '~/routing/plans/config/types';

export interface SortDropdownProps {
  onChange: (sortBy: PlansSortBy, sortOrder: PlansSortOrder) => void;
  sortBy: PlansSortBy;
  sortOrder: PlansSortOrder;
}

const PLANS_SORT_BY_VALUES: readonly PlansSortBy[] = [
  'createdAt',
  'name',
  'updatedAt',
];

const isPlansSortBy = (value: string): value is PlansSortBy =>
  PLANS_SORT_BY_VALUES.some((candidate) => candidate === value);

const isPlansSortOrder = (value: string): value is PlansSortOrder =>
  PLANS_SORT_ORDER.some((candidate) => candidate === value);

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
        <SelectValue placeholder="Add permission…" />
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
