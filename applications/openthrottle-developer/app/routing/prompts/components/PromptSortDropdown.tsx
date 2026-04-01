import * as React from 'react';
import { PROMPTS_SORT_OPTIONS } from '~/routing/prompts/config';
import {
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

export interface PromptSortDropdownProps {
  readonly onChange: (
    sortBy: PromptsSortBy,
    sortOrder: PromptsSortOrder,
  ) => void;
  readonly sortBy: PromptsSortBy;
  readonly sortOrder: PromptsSortOrder;
}

/**
 * @description Single dropdown to sort prompts (combines sortBy and sortOrder).
 */
export const PromptSortDropdown = (
  props: PromptSortDropdownProps,
): React.JSX.Element => {
  const { sortBy, sortOrder, onChange } = props;

  // Hooks

  // Setup
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PROMPTS_SORT_OPTIONS.some((o) => o.value === value)
    ? value
    : 'updatedAt-desc';

  // Handlers
  const handleChange = React.useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [by, order] = e.target.value.split('-') as [
        PromptsSortBy,
        PromptsSortOrder,
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
      aria-label="Sort prompts"
      className="rounded-md border border-input px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[11rem] shrink-0"
      data-testid="PromptSortDropdown"
      onChange={handleChange}
      value={resolvedValue}
    >
      {PROMPTS_SORT_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
