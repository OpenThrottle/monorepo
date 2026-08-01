import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';
import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import { isWorkspaceEditorId } from '~/routing/settings/utils/is-workspace-editor-id';

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
): React.ReactElement => {
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
        onChange={(next) => onChange(next.filter(isWorkspaceEditorId))}
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
