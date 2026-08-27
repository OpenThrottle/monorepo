import * as React from 'react';
import clsx from 'clsx';
import { CheckIcon, InfoIcon } from 'lucide-react';
import { EditorPresenceState } from '~/__generated__/graphql';
import { WORKSPACE_EDITOR_OPTIONS } from '~/routing/settings/config/workspace-editors';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { GetEditorPresenceQuery } from '~/__generated__/graphql';

type EditorPresenceEntry =
  GetEditorPresenceQuery['editorPresence']['editors'][number];

export interface WorkspaceEditorPresenceHintsProps {
  className?: string;
  /** Probed presence, or null when the query failed — both render no hints. */
  editors?: readonly EditorPresenceEntry[] | null;
}

/**
 * @description Advisory hints about which editors were detected on the machine hosting
 * the server. Strictly display-only: it never disables a control, never changes the
 * submitted selection, and renders nothing at all for UNKNOWN — the state the server
 * returns when it is not entitled to make a claim (a containerized server cannot see
 * the user's filesystem). Silence is the correct output when we do not know.
 */
export const WorkspaceEditorPresenceHints = (
  props: WorkspaceEditorPresenceHintsProps,
): React.ReactElement | null => {
  const { className, editors } = props;

  // Hooks

  // Setup
  // UNKNOWN carries no information, so it is filtered out before anything renders
  // rather than being given a muted or placeholder treatment.
  const hints = (editors ?? []).filter(
    (entry) => entry.presence !== EditorPresenceState.Unknown,
  );

  const labelFor = (entry: EditorPresenceEntry): string =>
    WORKSPACE_EDITOR_OPTIONS.find((option) => option.value === entry.editor)
      ?.label ?? entry.editor;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (hints.length === 0) return null;

  return (
    <div
      className={clsx('space-y-1', className)}
      data-testid="WorkspaceEditorPresenceHints"
    >
      <p className="text-muted-foreground text-xs font-medium">
        {WORKSPACE_SETTINGS_COPY.presenceHeading}
      </p>
      <ul className="space-y-1">
        {hints.map((entry) => {
          const installed = entry.presence === EditorPresenceState.Installed;

          return (
            <li
              className="text-muted-foreground flex items-start gap-1.5 text-xs"
              data-presence={entry.presence}
              data-testid={`WorkspaceEditorPresenceHint-${entry.editor}`}
              key={entry.editor}
            >
              {installed ? (
                <CheckIcon aria-hidden={true} className="mt-0.5 size-3.5" />
              ) : (
                <InfoIcon aria-hidden={true} className="mt-0.5 size-3.5" />
              )}
              <span>
                <span className="text-foreground font-medium">
                  {labelFor(entry)}
                </span>{' '}
                {installed
                  ? WORKSPACE_SETTINGS_COPY.presenceInstalledSuffix
                  : WORKSPACE_SETTINGS_COPY.presenceNotFoundSuffix}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
