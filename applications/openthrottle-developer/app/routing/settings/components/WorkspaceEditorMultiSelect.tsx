import * as React from 'react';
import { MultiSelect } from '@openthrottle/react-router-shadcn';
import type { EditorPresenceState } from '~/__generated__/graphql';
import { isWorkspaceEditorId } from '~/global/config/workspace-editors';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import { WorkspaceEditorPresenceMarker } from '~/routing/settings/components/WorkspaceEditorPresenceMarker';
import {
  getEditorPresenceStatus,
  readEditorPresence,
} from '~/routing/settings/utils/workspace-editor-presence-status';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorMultiSelectProps {
  name?: string;
  onChange: (value: WorkspaceEditorId[]) => void;
  /**
   * Advisory presence per editor, or null when the probe failed. Display-only: it never
   * disables, reorders, filters or pre-selects an option — an all-UNKNOWN index (a
   * containerized server) must leave the picker behaving exactly as it does with none.
   */
  presence?: ReadonlyMap<WorkspaceEditorId, EditorPresenceState> | null;
  value: WorkspaceEditorId[];
}

/**
 * @description Multi-select for workspace editor preferences (Claude Code, Cursor, VS Code),
 * carrying each editor's detection state on the option itself — the picker is where the
 * choice is actually made, so the advisory belongs here and not only in the row below it.
 */
export const WorkspaceEditorMultiSelect = (
  props: WorkspaceEditorMultiSelectProps,
): React.ReactElement => {
  const { name = 'enabledEditors', onChange, presence, value } = props;

  // Hooks

  // Setup
  const options = WORKSPACE_EDITOR_OPTIONS.map((option) => {
    const state = readEditorPresence(presence, option.value);
    const status = getEditorPresenceStatus(state);
    // UNKNOWN reads as a plain label with no marker and no hint — identical to having
    // no presence data at all, which is the point: silence, not a placeholder.
    const isSilent = status.tone === 'neutral';

    return {
      adornment: isSilent ? undefined : (
        <WorkspaceEditorPresenceMarker
          editorLabel={option.label}
          presence={state}
        />
      ),
      hint: isSilent ? undefined : status.label,
      label: option.label,
      value: option.value,
    };
  });

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
        options={options}
        placeholder="Editors to configure…"
        value={[...value]}
      />
    </>
  );
};
