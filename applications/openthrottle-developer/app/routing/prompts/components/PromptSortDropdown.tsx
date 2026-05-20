import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { PROMPTS_SORT_OPTIONS } from '~/routing/prompts/config';
import {
  PromptsSortBy,
  PromptsSortOrder,
} from '~/routing/prompts/config/types';

export interface PromptSortDropdownProps {
  onChange: (sortBy: PromptsSortBy, sortOrder: PromptsSortOrder) => void;
  sortBy: PromptsSortBy;
  sortOrder: PromptsSortOrder;
}

/**
 * @description Single dropdown to sort prompts (combines sortBy and sortOrder).
 */
export const PromptSortDropdown = (props: PromptSortDropdownProps) => {
  const { sortBy, sortOrder, onChange } = props;

  // Hooks

  // Setup
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PROMPTS_SORT_OPTIONS.some((o) => o.value === value)
    ? value
    : 'updatedAt-desc';

  // Handlers
  const handleChange = React.useCallback(
    (nextValue: string) => {
      const [by, order] = nextValue.split('-') as [
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
    <Select onValueChange={handleChange} value={resolvedValue}>
      <SelectTrigger
        aria-label="Sort prompts"
        className="w-[200px]"
        data-testid="PromptSortDropdown"
      >
        <SelectValue placeholder="Sort" />
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
