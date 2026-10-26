import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Spinner,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { BLOG_STALE_WRITE_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostStaleWriteDialogProps {
  readonly isOverwriting: boolean;
  /** Closed without choosing: local edits stay, nothing is saved. */
  readonly onDismiss: () => void;
  readonly onOverwrite: () => void;
  readonly onReload: () => void;
  readonly open: boolean;
}

/**
 * @description Shown when a save was rejected because the post changed on the
 * server after it was loaded. Reload discards local edits and re-reads the
 * post; Overwrite resends the same changes without the stale check.
 *
 * Local state, not a URL-synced overlay: opening it must not be a navigation
 * that re-runs the route loader.
 */
export const BlogPostStaleWriteDialog = (
  props: BlogPostStaleWriteDialogProps,
): React.ReactElement => {
  const { isOverwriting, onDismiss, onOverwrite, onReload, open } = props;

  // Hooks

  // Setup

  // Handlers
  const handleOpenChange = (next: boolean): void => {
    if (!next && !isOverwriting) {
      onDismiss();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent data-testid="BlogPostStaleWriteDialog" showClose={false}>
        <DialogHeader>
          <DialogTitle>{BLOG_STALE_WRITE_COPY.title}</DialogTitle>
          <DialogDescription>
            {BLOG_STALE_WRITE_COPY.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isOverwriting}
            onClick={onReload}
            type="button"
            variant="outline"
          >
            {BLOG_STALE_WRITE_COPY.reload}
          </Button>
          <Button
            disabled={isOverwriting}
            onClick={onOverwrite}
            type="button"
            variant="destructive"
          >
            {isOverwriting ? <Spinner /> : null}
            {isOverwriting
              ? BLOG_STALE_WRITE_COPY.overwriting
              : BLOG_STALE_WRITE_COPY.overwrite}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
