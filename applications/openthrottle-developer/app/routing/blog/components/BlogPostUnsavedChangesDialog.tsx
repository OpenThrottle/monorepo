import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import type { Blocker } from 'react-router';

import { BLOG_UNSAVED_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostUnsavedChangesDialogProps {
  readonly blocker: Blocker;
}

/**
 * @description Confirms leaving the editor with unsaved edits. Open while the
 * navigation {@link Blocker} is blocked; "Keep editing" resets it, "Leave
 * without saving" lets the navigation proceed.
 */
export const BlogPostUnsavedChangesDialog = (
  props: BlogPostUnsavedChangesDialogProps,
): React.ReactElement => {
  const { blocker } = props;

  // Hooks

  // Setup
  const open = blocker.state === 'blocked';

  // Handlers
  const handleStay = (): void => {
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
  };

  const handleLeave = (): void => {
    if (blocker.state === 'blocked') {
      blocker.proceed();
    }
  };

  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      handleStay();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent data-testid="BlogPostUnsavedChangesDialog">
        <DialogHeader>
          <DialogTitle>{BLOG_UNSAVED_COPY.title}</DialogTitle>
          <DialogDescription>{BLOG_UNSAVED_COPY.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleStay} type="button" variant="outline">
            {BLOG_UNSAVED_COPY.stay}
          </Button>
          <Button onClick={handleLeave} type="button" variant="destructive">
            {BLOG_UNSAVED_COPY.leave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
