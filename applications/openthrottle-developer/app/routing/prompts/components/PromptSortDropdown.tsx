import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
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
    (value: string) => {
      const [by, order] = value.split('-') as [PromptsSortBy, PromptsSortOrder];

      onChange(by, order);
    },

    [onChange],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select
      aria-label="Sort prompts"
      data-testid="PromptSortDropdown"
      onValueChange={handleChange}
      value={resolvedValue}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Poll interval…" />
      </SelectTrigger>
      <SelectContent>
        {PROMPTS_SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
