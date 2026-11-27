import { fillTemplate } from '@openthrottle/nodejs-utils';
import { DiffView } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';

export interface ChatSessionDrawerChangesPatchProps {
  /** True for a binary file: there is no patch to show. */
  readonly isBinary: boolean;
  /** True when the host cut the patch at its size cap. */
  readonly isTruncated: boolean;
  /** Unified patch text; undefined while it loads or when none came back. */
  readonly patch: string | undefined;
  readonly path: string;
}

/**
 * @description The selected file's patch, inside {@link ChatSessionDrawerChangesDialog}: a scrollable monospace
 * {@link DiffView}, or the reason there is none yet (loading, binary).
 *
 * @public
 */
export const ChatSessionDrawerChangesPatch = (
  props: ChatSessionDrawerChangesPatchProps,
): React.ReactElement => {
  const { isBinary, isTruncated, patch, path } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const label = fillTemplate(copy.patchLabel, { path });

  // Handlers

  // Markup
  const note = (text: string): React.ReactElement => {
    return (
      <p
        className="text-muted-foreground text-xs"
        data-testid="ChatSessionDrawerChangesPatch-note"
      >
        {text}
      </p>
    );
  };

  // Life Cycle

  // 🔌 Short Circuit
  if (isBinary) {
    return note(copy.binary);
  }
  if (patch === undefined) {
    return note(copy.loadingPatch);
  }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-1"
      data-testid="ChatSessionDrawerChangesPatch"
    >
      <DiffView
        aria-label={label}
        className="bg-muted/30 min-h-0 flex-1 overflow-auto rounded border"
        patch={patch}
        role="region"
        tabIndex={0}
      />
      {isTruncated && note(copy.patchTruncated)}
    </div>
  );
};
