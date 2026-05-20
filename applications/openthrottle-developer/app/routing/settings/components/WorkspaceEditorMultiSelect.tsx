import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';
import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

export interface WorkspaceEditorMultiSelectProps {
  name?: string;
  onChange: (value: WorkspaceEditorId[]) => void;
  value: WorkspaceEditorId[];
}

/**
 * @description Multi-select for workspace editor preferences (Cursor, VS Code).
 */
export const WorkspaceEditorMultiSelect = (
  props: WorkspaceEditorMultiSelectProps,
) => {
  const { name = 'enabledEditors', onChange, value } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      {value.map((editor) => (
        <input key={editor} name={name} type="hidden" value={editor} />
      ))}
      <MultiSelect
        data-testid="WorkspaceEditorMultiSelect"
        onChange={(next) => onChange(next as WorkspaceEditorId[])}
        options={WORKSPACE_EDITOR_OPTIONS.map((opt) => ({
          label: opt.label,
          value: opt.value,
        }))}
        placeholder="Editors to configure…"
        value={[...value]}
      />
    </>
  );
};
