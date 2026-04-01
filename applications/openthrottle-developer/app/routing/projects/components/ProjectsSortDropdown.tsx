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
} from '~/routing/prompts/config/types';
import type {
  ProjectsSortBy,
  ProjectsSortOrder,
} from '~/routing/prompts/config/types';
import { PROJECTS_SORT_OPTIONS } from '~/routing/projects/config';

/**
 * @description Parses sortBy and sortOrder from URL search params; defaults to createdAt-desc.
 */
export function parseSortFromSearchParams(searchParams: URLSearchParams): {
  sortBy: ProjectsSortBy;
  sortOrder: ProjectsSortOrder;
} {
  const by = searchParams.get('sortBy');
  const order = searchParams.get('sortOrder');

  return {
    sortBy: (PROJECTS_SORT_BY as readonly string[]).includes(by ?? '')
      ? (by as ProjectsSortBy)
      : 'createdAt',
    sortOrder: (PROJECTS_SORT_ORDER as readonly string[]).includes(order ?? '')
      ? (order as ProjectsSortOrder)
      : 'desc',
  };
}

export interface ProjectsSortDropdownProps {
  readonly onChange: (
    sortBy: ProjectsSortBy,
    sortOrder: ProjectsSortOrder,
  ) => void;
  readonly sortBy: ProjectsSortBy;
  readonly sortOrder: ProjectsSortOrder;
}

/**
 * @description Single dropdown to sort projects (combines sortBy and sortOrder). Uses shadcn Select; matches plans SortDropdown API: onChange(sortBy, sortOrder).
 */
export function ProjectsSortDropdown(
  props: ProjectsSortDropdownProps,
): React.JSX.Element {
  const { sortBy, sortOrder, onChange } = props;
  const value = `${sortBy}-${sortOrder}`;
  const resolvedValue = PROJECTS_SORT_OPTIONS.some((o) => o.value === value)
    ? value
    : 'createdAt-desc';

  const handleValueChange = React.useCallback(
    (val: string) => {
      const [by, order] = val.split('-') as [ProjectsSortBy, ProjectsSortOrder];
      onChange(by, order);
    },
    [onChange],
  );

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
}
