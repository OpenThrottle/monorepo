import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';

interface AssigneeMultiSelectProps {
  readonly onChange: (value: string[]) => void;
  readonly options: readonly string[];
  readonly value: readonly string[];
}

/**
 * @description Multi-select dropdown to filter plans by assignee. Label "Assignee"; options shown with @ prefix. Updates URL search params on change.
 */
export function AssigneeMultiSelect(
  props: AssigneeMultiSelectProps,
): React.ReactElement {
  const { onChange, options, value } = props;

  // Hooks

  // Setup
  const selectOptions = options.map((opt) => ({
    label: `@${opt}`,
    value: opt,
  }));

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MultiSelect
      className="min-w-40 shrink-0"
      onChange={onChange}
      options={selectOptions}
      placeholder="Assignee…"
      value={[...value]}
    />
  );
}
