import * as React from 'react';
import clsx from 'clsx';
import { EditorPresenceState } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_LABELS } from '~/routing/settings/config/workspace-editors';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import { WorkspaceEditorPresenceChip } from '~/routing/settings/components/WorkspaceEditorPresenceChip';
import type { GetEditorPresenceQuery } from '~/__generated__/graphql';

export interface WorkspaceEditorPresenceHintsProps {
  className?: string;
  /** The probe result, or null when the query failed — null renders nothing at all. */
  presence?: GetEditorPresenceQuery['editorPresence'] | null;
}

/**
 * @description Advisory hints about which editors were detected on the machine hosting
 * the server. Strictly display-only: it never disables a control and never changes the
 * submitted selection. It holds three distinct outcomes apart, which the previous version
 * collapsed into one silent row:
 *
 * - `null` — the query failed. Render nothing; we have no result to characterise.
 * - `trusted: false` — the server cannot see the user's machine (containerized, or a
 *   platform with no verified probe). Say so, and claim nothing. Every entry is UNKNOWN
 *   in this case, so there are no chips to show either way.
 * - trusted — render a chip per editor the probe made a claim about. UNKNOWN entries are
 *   still filtered out individually: absence of a claim must not look like a negative one.
 *
 * `scannedAt` is deliberately not surfaced. The probe runs per page load behind a short
 * soft TTL, so a relative timestamp would read "just now" on every render — noise that
 * implies staleness the user never actually has to reason about.
 */
export const WorkspaceEditorPresenceHints = (
  props: WorkspaceEditorPresenceHintsProps,
): React.ReactElement | null => {
  const { className, presence } = props;

  // Hooks

  // Setup
  const hints = (presence?.editors ?? []).filter(
    (entry) => entry.presence !== EditorPresenceState.Unknown,
  );
  const hasNotFound = hints.some(
    (entry) => entry.presence === EditorPresenceState.NotFound,
  );
  // An all-UNKNOWN result is the same situation as an explicitly untrusted one — the
  // server had nothing it was entitled to claim — so both get the same honest note.
  const isUntrusted =
    Boolean(presence) && (!presence?.trusted || hints.length === 0);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!presence) return null;

  if (isUntrusted) {
    return (
      <p
        className={clsx('text-muted-foreground text-xs', className)}
        data-testid="WorkspaceEditorPresenceUntrusted"
      >
        {WORKSPACE_SETTINGS_COPY.presenceUntrustedNote}
      </p>
    );
  }

  return (
    <div
      className={clsx('space-y-1.5', className)}
      data-testid="WorkspaceEditorPresenceHints"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          {WORKSPACE_SETTINGS_COPY.presenceHeading}
        </span>
        {hints.map((entry) => (
          <WorkspaceEditorPresenceChip
            editor={entry.editor}
            editorLabel={WORKSPACE_EDITOR_LABELS[entry.editor] ?? entry.editor}
            key={entry.editor}
            presence={entry.presence}
          />
        ))}
      </div>
      {hasNotFound ? (
        <p className="text-muted-foreground text-xs">
          {WORKSPACE_SETTINGS_COPY.presenceNotFoundCaption}
        </p>
      ) : null}
    </div>
  );
};
