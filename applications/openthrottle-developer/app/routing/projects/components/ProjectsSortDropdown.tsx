import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import {
  PROJECTS_SORT_BY,
  PROJECTS_SORT_ORDER,
  type ProjectsSortBy,
  type ProjectsSortOrder,
} from '~/routing/prompts/config/types';
import { PROJECTS_SORT_OPTIONS } from '~/routing/projects/config';

export interface ProjectsSortDropdownProps {
  onChange: (sortBy: ProjectsSortBy, sortOrder: ProjectsSortOrder) => void;
  sortBy: ProjectsSortBy;
  sortOrder: ProjectsSortOrder;
}

/**
 * @description Single dropdown to sort projects (combines sortBy and sortOrder). Uses shadcn Select; matches plans SortDropdown API: onChange(sortBy, sortOrder).
 */
export const ProjectsSortDropdown = (
  props: ProjectsSortDropdownProps,
): React.ReactElement => {
  const { sortBy, sortOrder, onChange } = props;

  // Hooks

  // Setup
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PROJECTS_SORT_OPTIONS.some((o) => o.value === value)
    ? value
    : 'createdAt-desc';

  // Handlers
  const handleValueChange = React.useCallback(
    (val: string) => {
      const [byRaw, orderRaw] = val.split('-');
      const by: ProjectsSortBy =
        PROJECTS_SORT_BY.find((v) => v === byRaw) ?? 'createdAt';
      const order: ProjectsSortOrder =
        PROJECTS_SORT_ORDER.find((v) => v === orderRaw) ?? 'desc';
      onChange(by, order);
    },
    [onChange],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Select onValueChange={handleValueChange} value={resolvedValue}>
      <SelectTrigger
        aria-label="Sort projects"
        className="h-9 w-44 shrink-0 px-3"
      >
        <SelectValue placeholder="Sort" />
      </SelectTrigger>
      <SelectContent>
        {PROJECTS_SORT_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
