import * as React from 'react';
import clsx from 'clsx';
import { EditorPresenceState } from '~/__generated__/graphql';
import { getEditorPresenceStatus } from '~/routing/settings/utils/workspace-editor-presence-status';

export interface WorkspaceEditorPresenceMarkerProps {
  className?: string;
  /** Human-readable editor name, used to build the screen-reader sentence. */
  editorLabel: string;
  /** Probed presence. UNKNOWN renders nothing. */
  presence: EditorPresenceState;
}

/**
 * @description The one status marker every editor-availability surface renders — an icon
 * plus visually-hidden text, both taken from the shared presence descriptor so the hints
 * row, the picker options and the per-repository chips cannot drift apart. Renders
 * nothing for UNKNOWN: absence of a claim must never look like a negative claim, so the
 * neutral tone is skipped rather than given a placeholder.
 */
export const WorkspaceEditorPresenceMarker = (
  props: WorkspaceEditorPresenceMarkerProps,
): React.ReactElement | null => {
  const { className, editorLabel, presence } = props;

  // Hooks

  // Setup
  const status = getEditorPresenceStatus(presence);
  const Icon = status.icon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (status.tone === 'neutral') return null;

  return (
    <span
      className={clsx('inline-flex items-center', className)}
      data-presence={presence}
      data-testid={`WorkspaceEditorPresenceMarker-${presence}`}
    >
      <Icon
        aria-hidden={true}
        className={clsx('size-3 shrink-0', status.indicatorClassName)}
      />
      <span className="sr-only">{status.srLabel(editorLabel)}</span>
    </span>
  );
};
