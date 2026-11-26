import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  SESSION_DIFF_STATUS_ICONS,
  SESSION_DIFF_STATUS_TONES,
} from '../data/chat-session-diff-status';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionDiffFile } from '../types';
import { describeDiffFileTitle } from '../utils/session-diff';

export interface ChatSessionDrawerChangesRowProps {
  readonly file: ChatSessionDiffFile;
  readonly isSelected: boolean;
  readonly onSelect: (path: string) => void;
}

/**
 * @description One file of the Changes section: status icon, path (directory muted), +/- counts.
 * A button that selects the file so its patch shows below the list.
 *
 * @public
 */
export const ChatSessionDrawerChangesRow = (
  props: ChatSessionDrawerChangesRowProps,
): React.ReactElement => {
  const { file, isSelected, onSelect } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const Icon = SESSION_DIFF_STATUS_ICONS[file.status];
  const slash = file.path.lastIndexOf('/');
  const directory = file.path.slice(0, slash + 1);
  const name = file.path.slice(slash + 1);
  const title = describeDiffFileTitle(file);

  // Handlers
  const handleClick = (): void => {
    onSelect(file.path);
  };

  // Markup
  const counts = !file.binary && (
    <span className="shrink-0 tabular-nums">
      <span className={SESSION_DIFF_STATUS_TONES.added}>+{file.additions}</span>{' '}
      <span className={SESSION_DIFF_STATUS_TONES.deleted}>
        −{file.deletions}
      </span>
    </span>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li>
      <button
        aria-pressed={isSelected}
        className={cn(
          'hover:bg-accent/50 flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-xs',
          isSelected && 'bg-accent',
        )}
        data-status={file.status}
        data-testid="ChatSessionDrawerChanges-row"
        onClick={handleClick}
        title={title}
        type="button"
      >
        <Icon
          aria-label={copy.statuses[file.status]}
          className={cn(
            'size-3.5 shrink-0',
            SESSION_DIFF_STATUS_TONES[file.status],
          )}
          role="img"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className="font-medium">{name}</span>{' '}
          <span className="text-muted-foreground">{directory}</span>
        </span>
        {counts}
      </button>
    </li>
  );
};
