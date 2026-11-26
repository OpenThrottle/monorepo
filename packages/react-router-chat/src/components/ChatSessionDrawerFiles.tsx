import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import {
  SESSION_FILE_OP_ICONS,
  SESSION_FILE_OP_TONES,
} from '../data/chat-session-file-ops';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatMessage } from '../types';
import { deriveSessionFiles } from '../utils/deriveSessionFiles';
import { fillTemplate } from '../utils/fillTemplate';
import { formatFileCount } from '../utils/session-diff';

export interface ChatSessionDrawerFilesProps {
  readonly messages: readonly ChatMessage[];
  /**
   * Selects a file's diff in the Changes section; rows are plain text when
   * undefined (the host has no diff to link to).
   */
  readonly onSelectFile: ((path: string) => void) | undefined;
  /** Checkout root stripped from paths; absolute paths stay when undefined. */
  readonly rootPath: string | undefined;
}

/**
 * @description Body of the session drawer's Files section: every file the
 * agent's edit tools touched, derived from the thread's tool events (so a
 * reopened conversation rebuilds it), newest first. A row is a button into the
 * Changes section's diff when the host supplies `onSelectFile`; the full path
 * is in each row's `title`.
 *
 * @public
 */
export const ChatSessionDrawerFiles = (
  props: ChatSessionDrawerFilesProps,
): React.ReactElement => {
  const { messages, onSelectFile, rootPath } = props;

  // Hooks
  const files = React.useMemo(() => {
    return deriveSessionFiles(messages, rootPath);
  }, [messages, rootPath]);

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.files;
  const countLabel = formatFileCount(files.length);

  // Handlers

  // Markup
  const rows = files.map((file) => {
    const Icon = SESSION_FILE_OP_ICONS[file.op];
    const slash = file.path.lastIndexOf('/');
    const directory = file.path.slice(0, slash + 1);
    const name = file.path.slice(slash + 1);
    const hasCounts = file.added !== undefined || file.removed !== undefined;

    const body = (
      <>
        <Icon
          aria-label={copy.ops[file.op]}
          className={cn('size-3.5 shrink-0', SESSION_FILE_OP_TONES[file.op])}
          role="img"
        />
        <span className="min-w-0 flex-1 truncate">
          <span className="text-muted-foreground">{directory}</span>
          <span className="font-medium">{name}</span>
        </span>
        {hasCounts && (
          <span
            className="shrink-0 tabular-nums"
            data-testid="ChatSessionDrawerFiles-counts"
          >
            {file.added !== undefined && (
              <span className={SESSION_FILE_OP_TONES.created}>
                +{file.added}
              </span>
            )}{' '}
            {file.removed !== undefined && (
              <span className={SESSION_FILE_OP_TONES.deleted}>
                −{file.removed}
              </span>
            )}
          </span>
        )}
      </>
    );
    const rowClassName = 'flex w-full items-center gap-2 text-left';

    return (
      <li
        className="py-0.5 text-xs"
        data-op={file.op}
        data-testid="ChatSessionDrawerFiles-row"
        key={file.path}
        title={file.path}
      >
        {onSelectFile === undefined && (
          <div className={rowClassName}>{body}</div>
        )}
        {onSelectFile !== undefined && (
          <button
            aria-label={fillTemplate(copy.showDiff, { path: file.path })}
            className={cn(rowClassName, 'hover:bg-accent rounded px-1')}
            data-testid="ChatSessionDrawerFiles-select"
            onClick={() => onSelectFile(file.path)}
            type="button"
          >
            {body}
          </button>
        )}
      </li>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (files.length === 0) {
    return (
      <p
        className="text-muted-foreground px-4 pb-3 text-xs"
        data-testid="ChatSessionDrawerFiles"
      >
        {copy.empty}
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 px-4 pb-3"
      data-testid="ChatSessionDrawerFiles"
    >
      <span
        className="text-muted-foreground text-xs"
        data-testid="ChatSessionDrawerFiles-count"
      >
        {countLabel}
      </span>
      <ul className="flex flex-col">{rows}</ul>
    </div>
  );
};
