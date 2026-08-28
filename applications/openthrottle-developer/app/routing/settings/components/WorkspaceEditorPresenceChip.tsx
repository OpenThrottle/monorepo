import * as React from 'react';
import clsx from 'clsx';
import { Badge } from '@openthrottle/react-router-shadcn';
import { EditorPresenceState } from '~/__generated__/graphql';
import { WorkspaceEditorPresenceMarker } from '~/routing/settings/components/WorkspaceEditorPresenceMarker';
import { getEditorPresenceStatus } from '~/routing/settings/utils/workspace-editor-presence-status';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorPresenceChipProps {
  className?: string;
  /** Editor this chip describes; drives the stable per-chip test id. */
  editor: WorkspaceEditorId;
  /** Human-readable editor name. */
  editorLabel: string;
  /** Probed presence. UNKNOWN renders nothing. */
  presence: EditorPresenceState;
}

/**
 * @description One editor-availability chip in the hints row. Detected reads as a positive
 * claim — filled check, solid badge, the editor name at full contrast. Not-detected reads
 * as *quieter*, not as an error: hollow marker, outline badge, the whole chip dimmed. It is
 * a normal, fully supported state, so nothing here is styled as a failure.
 */
export const WorkspaceEditorPresenceChip = (
  props: WorkspaceEditorPresenceChipProps,
): React.ReactElement | null => {
  const { className, editor, editorLabel, presence } = props;

  // Hooks

  // Setup
  const status = getEditorPresenceStatus(presence);
  const isInstalled = presence === EditorPresenceState.Installed;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (status.tone === 'neutral') return null;

  return (
    <Badge
      className={clsx(
        'gap-1 font-normal',
        // The whole chip dims for not-detected rather than only its icon changing —
        // that difference is what makes the two states legible at a glance.
        isInstalled ? 'text-foreground' : 'text-muted-foreground opacity-80',
        className,
      )}
      data-presence={presence}
      data-testid={`WorkspaceEditorPresenceHint-${editor}`}
      variant={status.badgeVariant}
    >
      <WorkspaceEditorPresenceMarker
        editorLabel={editorLabel}
        presence={presence}
      />
      <span className={clsx(isInstalled && 'font-medium')}>{editorLabel}</span>{' '}
      {status.label}
    </Badge>
  );
};
