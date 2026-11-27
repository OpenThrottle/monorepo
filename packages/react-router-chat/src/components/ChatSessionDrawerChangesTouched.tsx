import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  SESSION_DIFF_STATUS_ICONS,
  SESSION_DIFF_STATUS_TONES,
} from '../data/chat-session-diff-status';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatFileHrefBuilder } from '../types';
import type { SessionFile } from '../utils/deriveSessionFiles';
import { splitPath } from '../utils/path';
import { ChatSessionDrawerOpenFile } from './ChatSessionDrawerOpenFile';

export interface ChatSessionDrawerChangesTouchedProps {
  /** Builds the open-in-editor link; undefined hides the action. */
  readonly buildFileHref: ChatFileHrefBuilder | undefined;
  readonly files: readonly SessionFile[];
  /** What the list is: touched with no net change, or touched before the diff caught up. */
  readonly heading: string;
}

/**
 * @description The Changes section's muted list of files this conversation touched that the
 * diff does not list: op icon, path (directory muted) and the tool-reported +/- counts, newest
 * first. Rows have no patch to open; each may carry an open-in-editor link.
 *
 * @public
 */
export const ChatSessionDrawerChangesTouched = (
  props: ChatSessionDrawerChangesTouchedProps,
): React.ReactElement => {
  const { buildFileHref, files, heading } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;

  // Handlers

  // Markup
  const rows = files.map((file) => {
    const Icon = SESSION_DIFF_STATUS_ICONS[file.op];
    const { directory, name } = splitPath(file.path);
    const hasCounts = file.added !== undefined || file.removed !== undefined;
    const counts = hasCounts && (
      <span className="shrink-0 tabular-nums">
        {file.added !== undefined && <span>+{file.added}</span>}{' '}
        {file.removed !== undefined && <span>−{file.removed}</span>}
      </span>
    );

    return (
      <li
        className="flex items-center gap-2 px-1 py-0.5 text-xs"
        data-op={file.op}
        data-testid="ChatSessionDrawerChangesTouched-row"
        key={file.path}
        title={file.path}
      >
        <Icon
          aria-label={copy.statuses[file.op]}
          className={cn(
            'size-3.5 shrink-0',
            SESSION_DIFF_STATUS_TONES[file.op],
          )}
          role="img"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{name}</span> <span>{directory}</span>
        </span>
        {counts}
        <ChatSessionDrawerOpenFile
          buildFileHref={buildFileHref}
          path={file.path}
        />
      </li>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="text-muted-foreground flex flex-col gap-1"
      data-testid="ChatSessionDrawerChangesTouched"
    >
      <span className="text-xs">{heading}</span>
      <ul className="flex flex-col">{rows}</ul>
    </div>
  );
};
