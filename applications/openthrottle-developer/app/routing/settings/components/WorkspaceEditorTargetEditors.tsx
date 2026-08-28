import * as React from 'react';
import clsx from 'clsx';
import { Badge } from '@openthrottle/react-router-shadcn';
import { WorkspaceEditorPresenceMarker } from '~/routing/settings/components/WorkspaceEditorPresenceMarker';
import {
  getEditorPresenceStatus,
  readEditorPresence,
} from '~/routing/settings/utils/workspace-editor-presence-status';
import type {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import type { WorkspaceEditorTargetEditor } from '~/routing/settings/utils/workspace-editor-targets';

export interface WorkspaceEditorTargetEditorsProps {
  className?: string;
  /** Enabled editors an apply will configure for one repository. */
  editors: readonly WorkspaceEditorTargetEditor[];
  /**
   * Advisory presence per editor, or null when the probe failed — the null path renders
   * exactly as this cell did before presence existed. Every editor still gets a badge
   * regardless of state: an Apply is useful before the editor is installed.
   */
  presence?: ReadonlyMap<WorkspaceEditorId, EditorPresenceState> | null;
}

/**
 * @description The editors column of the repositories-to-configure table — one badge per
 * enabled editor, each marked with its detection state. This is the most action-adjacent
 * place availability matters, so the marker belongs here; it never disables anything.
 */
export const WorkspaceEditorTargetEditors = (
  props: WorkspaceEditorTargetEditorsProps,
): React.ReactElement => {
  const { className, editors, presence } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('flex flex-wrap gap-1', className)}>
      {editors.map((editor) => {
        const state = readEditorPresence(presence, editor.id);
        const status = getEditorPresenceStatus(state);
        // UNKNOWN gets no marker and no tooltip — the badge is exactly as it was.
        const isSilent = status.tone === 'neutral';

        return (
          <Badge
            className="gap-1"
            data-presence={state}
            data-testid={`WorkspaceEditorTargetEditor-${editor.id}`}
            key={editor.id}
            title={isSilent ? undefined : status.srLabel(editor.label)}
            variant="secondary"
          >
            <WorkspaceEditorPresenceMarker
              editorLabel={editor.label}
              presence={state}
            />
            {editor.label}
          </Badge>
        );
      })}
    </div>
  );
};
