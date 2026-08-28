import * as React from 'react';
import clsx from 'clsx';
import { Badge } from '@openthrottle/react-router-shadcn';
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
 * the server, rendered as a compact badge row. Strictly display-only: it never disables
 * a control, never changes the submitted selection, and renders nothing at all for
 * UNKNOWN — the state the server returns when it is not entitled to make a claim (a
 * containerized server cannot see the user's filesystem). Silence is the correct output
 * when we do not know.
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
  const hasNotFound = hints.some(
    (entry) => entry.presence === EditorPresenceState.NotFound,
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
      className={clsx('space-y-1.5', className)}
      data-testid="WorkspaceEditorPresenceHints"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-muted-foreground text-xs font-medium">
          {WORKSPACE_SETTINGS_COPY.presenceHeading}
        </span>
        {hints.map((entry) => {
          const installed = entry.presence === EditorPresenceState.Installed;

          return (
            <Badge
              className="text-muted-foreground gap-1 font-normal"
              data-presence={entry.presence}
              data-testid={`WorkspaceEditorPresenceHint-${entry.editor}`}
              key={entry.editor}
              variant={installed ? 'secondary' : 'outline'}
            >
              {installed ? (
                <CheckIcon aria-hidden={true} className="size-3" />
              ) : (
                <InfoIcon aria-hidden={true} className="size-3" />
              )}
              <span className="text-foreground font-medium">
                {labelFor(entry)}
              </span>{' '}
              {installed
                ? WORKSPACE_SETTINGS_COPY.presenceInstalledSuffix
                : WORKSPACE_SETTINGS_COPY.presenceNotFoundSuffix}
            </Badge>
          );
        })}
      </div>
      {hasNotFound ? (
        <p className="text-muted-foreground text-xs">
          {WORKSPACE_SETTINGS_COPY.presenceNotFoundCaption}
        </p>
      ) : null}
    </div>
  );
};
