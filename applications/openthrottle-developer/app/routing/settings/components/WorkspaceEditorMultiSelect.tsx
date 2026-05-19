import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';
import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';

interface WorkspaceEditorMultiSelectProps {
  readonly name?: string;
  readonly onChange: (value: WorkspaceEditorId[]) => void;
  readonly value: readonly WorkspaceEditorId[];
}

/**
 * @description Multi-select for workspace editor preferences (Cursor, VS Code).
 */
export function WorkspaceEditorMultiSelect(
  props: WorkspaceEditorMultiSelectProps,
): React.ReactElement {
  const { name = 'enabledEditors', onChange, value } = props;

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
}
