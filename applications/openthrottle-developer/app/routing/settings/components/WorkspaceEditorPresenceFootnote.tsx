import * as React from 'react';
import clsx from 'clsx';
import { formatWorkspaceEditorScannedAt } from '~/routing/settings/utils/workspace-editor-presence';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';

export interface WorkspaceEditorPresenceFootnoteProps {
  className?: string;
  /**
   * Timestamp of the probe, or null when it never ran. Typed loosely because
   * the DateTime scalar reaches the client as a `Date` despite codegen typing
   * it `string` — see `formatWorkspaceEditorScannedAt`.
   */
  scannedAt?: Date | string | null;
  /**
   * False when the server could not verify the host filesystem. That is a
   * different failure from "the editor is missing" and reads differently.
   */
  trusted?: boolean | null;
}

/**
 * @description Quiet provenance line under the editor grid: when the host was
 * last scanned, and whether that scan is a result or a guess. Renders nothing
 * when no probe returned — a failed probe must be invisible, not an error.
 */
export const WorkspaceEditorPresenceFootnote = (
  props: WorkspaceEditorPresenceFootnoteProps,
): React.ReactElement | null => {
  const { className, scannedAt, trusted } = props;

  // Hooks

  // Setup
  const formattedScannedAt = formatWorkspaceEditorScannedAt(scannedAt);
  const untrusted = trusted === false;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (formattedScannedAt === null && !untrusted) return null;

  return (
    <p
      className={clsx('text-muted-foreground text-xs', className)}
      data-testid="WorkspaceEditorPresenceFootnote"
    >
      {formattedScannedAt === null ? null : (
        <span>
          {WORKSPACE_SETTINGS_COPY.presenceScannedAtPrefix}
          {formattedScannedAt}.
        </span>
      )}
      {untrusted ? (
        <span> {WORKSPACE_SETTINGS_COPY.presenceUntrustedNote}</span>
      ) : null}
    </p>
  );
};
