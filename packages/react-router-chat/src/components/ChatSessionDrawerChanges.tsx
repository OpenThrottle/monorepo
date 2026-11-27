import { Button, cn } from '@openthrottle/react-router-shadcn';
import { RefreshCw } from 'lucide-react';
import * as React from 'react';

import { CHAT_PANEL_HOVER_CLASSES } from '../data/chat-panel.classes';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionChanges } from '../types';
import type { SessionFile } from '../utils/deriveSessionFiles';
import { fillTemplate } from '../utils/fillTemplate';
import { formatBaseRef, formatDiffSummary } from '../utils/session-diff';
import { ChatSessionDrawerChangesDialog } from './ChatSessionDrawerChangesDialog';
import { ChatSessionDrawerChangesRow } from './ChatSessionDrawerChangesRow';
import { ChatSessionDrawerChangesTouched } from './ChatSessionDrawerChangesTouched';

export interface ChatSessionDrawerChangesProps extends ChatSessionChanges {
  /** True while a turn streams: the diff only catches up when it ends. */
  readonly isStreaming: boolean;
  /** Files the agent's edit tools touched in this conversation. */
  readonly touchedFiles: readonly SessionFile[];
}

/**
 * @description Body of the session drawer's Changes section: `+A −D across N files vs <base>`,
 * a refresh button, one row per changed file (marked when this conversation touched it) and
 * a dialog with the selected file's patch. Files the conversation touched that the diff does
 * not list follow in a muted list; with no diff to show, that list is all there is.
 * Presentational: the diff, the selection and the lazily loaded patch come from the host.
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
    isStreaming,
    onCloseFile,
    onRefresh,
    onSelectFile,
    selectedFile,
    selectedPatch,
    touchedFiles,
  } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const files = diff?.available === true ? diff.files : [];
  const selected = files.find((file) => file.path === selectedFile);
  const touchedPaths = new Set(touchedFiles.map((file) => file.path));
  const listedPaths = new Set(files.map((file) => file.path));
  const touchedElsewhere = touchedFiles.filter((file) => {
    return !listedPaths.has(file.path);
  });
  // Only a settled, complete diff can say a touched file netted out to nothing.
  const isNetChangeKnown =
    diff?.available === true && !diff.filesTruncated && !isStreaming;
  const touchedHeading = isNetChangeKnown
    ? copy.touchedNoNetChange
    : copy.touchedHeading;

  // Handlers

  // Markup
  const touchedList = touchedElsewhere.length > 0 && (
    <ChatSessionDrawerChangesTouched
      files={touchedElsewhere}
      heading={touchedHeading}
    />
  );

  const note = (text: string): React.ReactElement => {
    return (
      <div
        className="flex flex-col gap-3 p-4"
        data-testid="ChatSessionDrawerChanges"
      >
        <p className="text-muted-foreground text-xs">{text}</p>
        {touchedList}
      </div>
    );
  };

  const patchDialog = (
    <ChatSessionDrawerChangesDialog
      file={selected}
      files={files}
      isTruncated={isPatchTruncated}
      onClose={onCloseFile}
      onSelectFile={onSelectFile}
      patch={selectedPatch}
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
      className="flex flex-col gap-2 p-4"
      data-testid="ChatSessionDrawerChanges"
    >
      <div className="flex items-center gap-2">
        <span
          className="text-muted-foreground min-w-0 flex-1 text-xs"
          data-testid="ChatSessionDrawerChanges-summary"
        >
          {formatDiffSummary(diff)}
        </span>
        <Button
          aria-label={copy.refresh}
          className={CHAT_PANEL_HOVER_CLASSES}
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
          <ChatSessionDrawerChangesRow
            file={file}
            isSelected={file.path === selectedFile}
            isTouched={touchedPaths.has(file.path)}
            key={file.path}
            onSelect={onSelectFile}
          />
        ))}
      </ul>
      {patchDialog}
      {diff.filesTruncated && (
        <p className="text-muted-foreground text-xs">{copy.filesTruncated}</p>
      )}
      {touchedList}
    </div>
  );
};
