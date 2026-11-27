import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  SESSION_FILE_OP_ICONS,
  SESSION_FILE_OP_TONES,
} from '../data/chat-session-file-ops';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { SessionFile } from '../utils/deriveSessionFiles';

export interface ChatSessionDrawerChangesTouchedProps {
  readonly files: readonly SessionFile[];
  /** What the list is: touched with no net change, or touched before the diff caught up. */
  readonly heading: string;
}

/**
 * @description The Changes section's muted list of files this conversation touched that the
 * diff does not list: op icon, path (directory muted) and the tool-reported +/- counts, newest
 * first. Rows are plain text; there is no patch to open.
 *
 * @public
 */
export const ChatSessionDrawerChangesTouched = (
  props: ChatSessionDrawerChangesTouchedProps,
): React.ReactElement => {
  const { files, heading } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.files;

  // Handlers

  // Markup
  const rows = files.map((file) => {
    const Icon = SESSION_FILE_OP_ICONS[file.op];
    const slash = file.path.lastIndexOf('/');
    const directory = file.path.slice(0, slash + 1);
    const name = file.path.slice(slash + 1);
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
          aria-label={copy.ops[file.op]}
          className={cn('size-3.5 shrink-0', SESSION_FILE_OP_TONES[file.op])}
          role="img"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{name}</span> <span>{directory}</span>
        </span>
        {counts}
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
