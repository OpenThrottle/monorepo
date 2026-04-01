import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';

export interface AssigneeMultiSelectProps {
  readonly onChange: (value: string[]) => void;
  readonly options: readonly string[];
  readonly value: readonly string[];
}

/**
 * @description Multi-select dropdown to filter plans by assignee. Label "Assignee"; options shown with @ prefix. Updates URL search params on change.
 */
export function AssigneeMultiSelect(
  props: AssigneeMultiSelectProps,
): React.JSX.Element {
  const { onChange, options, value } = props;
  const selectOptions = options.map((opt) => ({
    label: `@${opt}`,
    value: opt,
  }));
  return (
    <MultiSelect
      className="min-w-[10rem] shrink-0"
      onChange={onChange}
      options={selectOptions}
      placeholder="Assignee…"
      value={[...value]}
    />
  );
}
