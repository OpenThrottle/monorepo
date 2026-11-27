import { fillTemplate } from '@openthrottle/nodejs-utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as React from 'react';

import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type { ChatSessionDiffFile } from '../types';
import { describeDiffFile, findAdjacentFilePath } from '../utils/session-diff';
import { ChatSessionDrawerChangesPatch } from './ChatSessionDrawerChangesPatch';

export interface ChatSessionDrawerChangesDialogProps {
  /** The file whose patch is open; undefined keeps the dialog closed. */
  readonly file: ChatSessionDiffFile | undefined;
  /** Every listed file, in list order; the arrows step through it. */
  readonly files: readonly ChatSessionDiffFile[];
  /** True when the host cut the patch at its size cap. */
  readonly isTruncated: boolean;
  readonly onClose: () => void;
  /** Reports the file the arrows moved to. */
  readonly onSelectFile: (path: string) => void;
  /** Unified patch text; undefined while it loads. */
  readonly patch: string | undefined;
}

/**
 * @description The Changes section's patch viewer: a dialog, open while a file is
 * selected, titled with the file's path and showing its status, +/- counts and
 * {@link ChatSessionDrawerChangesPatch}. The Left/Right arrow keys (or the footer's
 * buttons) step to the previous/next file, wrapping at either end. Closing it reports
 * `onClose` so the host clears the selection.
 *
 * @public
 */
export const ChatSessionDrawerChangesDialog = (
  props: ChatSessionDrawerChangesDialogProps,
): React.ReactElement => {
  const { file, files, isTruncated, onClose, onSelectFile, patch } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.changes;
  const isOpen = file !== undefined;
  const description = file === undefined ? '' : describeDiffFile(file);
  const index = files.findIndex((entry) => entry.path === file?.path);
  const canStep = index !== -1 && files.length > 1;
  const position = fillTemplate(copy.patchDialogPosition, {
    index: `${index + 1}`,
    total: `${files.length}`,
  });

  // Handlers
  const handleOpenChange = (open: boolean): void => {
    if (!open) {
      onClose();
    }
  };

  const step = (delta: number): void => {
    if (file === undefined || !canStep) {
      return;
    }
    const path = findAdjacentFilePath(files, file.path, delta);
    if (path !== undefined) {
      onSelectFile(path);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    const hasModifier =
      event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (hasModifier) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  };

  // Markup
  const navigation = canStep && (
    <DialogFooter
      className="flex-row items-center justify-end gap-1 sm:space-x-0"
      data-testid="ChatSessionDrawerChangesDialog-navigation"
    >
      <Button
        aria-label={copy.previousFile}
        data-testid="ChatSessionDrawerChangesDialog-previous"
        onClick={() => step(-1)}
        size="icon"
        title={copy.previousFile}
        type="button"
        variant="ghost"
      >
        <ChevronLeft aria-hidden={true} className="size-4" />
      </Button>
      <span
        className="text-muted-foreground text-xs tabular-nums"
        data-testid="ChatSessionDrawerChangesDialog-position"
      >
        {position}
      </span>
      <Button
        aria-label={copy.nextFile}
        data-testid="ChatSessionDrawerChangesDialog-next"
        onClick={() => step(1)}
        size="icon"
        title={copy.nextFile}
        type="button"
        variant="ghost"
      >
        <ChevronRight aria-hidden={true} className="size-4" />
      </Button>
    </DialogFooter>
  );

  const body = file !== undefined && (
    <>
      <DialogHeader className="min-w-0 pr-8">
        <DialogTitle className="truncate font-mono text-sm" title={file.path}>
          {file.path}
        </DialogTitle>
        <DialogDescription className="text-xs">{description}</DialogDescription>
      </DialogHeader>
      <ChatSessionDrawerChangesPatch
        isBinary={file.binary}
        isTruncated={isTruncated}
        patch={patch}
        path={file.path}
      />
      {navigation}
    </>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={isOpen}>
      <DialogContent
        className="flex max-h-[min(85vh,900px)] w-full max-w-5xl flex-col"
        data-testid="ChatSessionDrawerChangesDialog"
        onKeyDown={handleKeyDown}
      >
        {body}
      </DialogContent>
    </Dialog>
  );
};
