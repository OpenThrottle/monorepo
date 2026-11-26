import { Badge, Button, cn } from '@openthrottle/react-router-shadcn';
import { GitPullRequest, RefreshCw } from 'lucide-react';
import * as React from 'react';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionDiff } from '../types';
import { fillTemplate } from '../utils/fillTemplate';
import {
  formatBaseRef,
  formatDiffSummary,
  formatPullRequestState,
} from '../utils/session-diff';
import { ChatSessionDrawerChangesPatch } from './ChatSessionDrawerChangesPatch';
import { ChatSessionDrawerChangesRow } from './ChatSessionDrawerChangesRow';

export interface ChatSessionDrawerChangesProps {
  /** The checkout's changes; undefined until fetched or when no checkout is known. */
  readonly diff: ChatSessionDiff | undefined;
  readonly isLoading: boolean;
  /** True when the host cut the selected file's patch at its size cap. */
  readonly isPatchTruncated: boolean;
  readonly onRefresh: () => void;
  readonly onSelectFile: (path: string) => void;
  /** Path (relative to the checkout) whose patch shows below the list. */
  readonly selectedFile: string | undefined;
  /** The selected file's unified patch; undefined while it loads. */
  readonly selectedPatch: string | undefined;
}

/**
 * @description Body of the session drawer's Changes section: `+A −D across N files vs <base>`,
 * the branch's pull-request chip when there is one, a refresh button, one row per changed file
 * and, under the list, the selected file's patch. Presentational: the diff, the selection and
 * the lazily loaded patch all come from the host.
 *
 * @public
 */
export const ChatSessionDrawerChanges = (
  props: ChatSessionDrawerChangesProps,
): React.ReactElement => {
  const {
    diff,
    isLoading,
    isPatchTruncated,
    onRefresh,
    onSelectFile,
    selectedFile,
    selectedPatch,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const files = diff?.available === true ? diff.files : [];
  const selected = files.find((file) => file.path === selectedFile);
  const pullRequest = diff?.available === true ? diff.pullRequest : undefined;

  // Handlers

  // Markup
  const note = (text: string): React.ReactElement => {
    return (
      <p
        className="text-muted-foreground px-4 pb-3 text-xs"
        data-testid="ChatSessionDrawerChanges"
      >
        {text}
      </p>
    );
  };

  const pullRequestState =
    pullRequest === undefined ? '' : formatPullRequestState(pullRequest);
  const pullRequestChip = pullRequest !== undefined && (
    <Badge asChild={true} data-testid="ChatSessionDrawerChanges-pr">
      <a
        href={pullRequest.url}
        rel="noopener noreferrer"
        target="_blank"
        title={fillTemplate(copy.pullRequest, {
          number: `${pullRequest.number}`,
          state: pullRequestState,
        })}
      >
        <GitPullRequest aria-hidden={true} className="size-3" />
        {fillTemplate(copy.pullRequestChip, {
          number: `${pullRequest.number}`,
          state: pullRequestState,
        })}
      </a>
    </Badge>
  );

  const selectedPatchPanel = selected !== undefined && (
    <ChatSessionDrawerChangesPatch
      isBinary={selected.binary}
      isTruncated={isPatchTruncated}
      patch={selectedPatch}
      path={selected.path}
    />
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (diff === undefined) {
    return note(isLoading ? copy.loading : copy.noCheckout);
  }
  if (!diff.available) {
    return note(diff.reason ?? copy.unavailable);
  }

  return (
    <div
      className="flex flex-col gap-2 px-4 pb-3"
      data-testid="ChatSessionDrawerChanges"
    >
      <div className="flex items-center gap-2">
        <span
          className="text-muted-foreground min-w-0 flex-1 text-xs"
          data-testid="ChatSessionDrawerChanges-summary"
        >
          {formatDiffSummary(diff)}
        </span>
        {pullRequestChip}
        <Button
          aria-label={copy.refresh}
          data-testid="ChatSessionDrawerChanges-refresh"
          disabled={isLoading}
          onClick={onRefresh}
          size="icon"
          title={copy.refresh}
          type="button"
          variant="ghost"
        >
          <RefreshCw
            aria-hidden={true}
            className={cn('size-3.5', isLoading && 'animate-spin')}
          />
        </Button>
      </div>
      {files.length === 0 && (
        <p className="text-muted-foreground text-xs">
          {fillTemplate(copy.empty, { base: formatBaseRef(diff) })}
        </p>
      )}
      <ul className="flex flex-col">
        {files.map((file) => (
          <React.Fragment key={file.path}>
            <ChatSessionDrawerChangesRow
              file={file}
              isSelected={file.path === selectedFile}
              onSelect={onSelectFile}
            />
            {/* The patch opens right under its row, not after the whole list. */}
            {file.path === selected?.path && <li>{selectedPatchPanel}</li>}
          </React.Fragment>
        ))}
      </ul>
      {diff.filesTruncated && (
        <p className="text-muted-foreground text-xs">{copy.filesTruncated}</p>
      )}
    </div>
  );
};
