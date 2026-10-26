import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
import type { BlogPostLifecycleAction } from '~/routing/blog/types';

export interface BlogPostLifecycleConfirmDialogProps {
  /** The action awaiting confirmation; `null` keeps the dialog closed. */
  readonly action: Extract<
    BlogPostLifecycleAction,
    'archive' | 'moveToDraft' | 'unpublish'
  > | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}

/**
 * @description Confirms Unpublish, Move to draft and Archive, which take a post
 * off the site, saying what each one does. Nothing is sent until the author
 * confirms.
 */
export const BlogPostLifecycleConfirmDialog = (
  props: BlogPostLifecycleConfirmDialogProps,
): React.ReactElement => {
  const { action, onCancel, onConfirm } = props;

  // Hooks

  // Setup
  const copy = action === null ? null : BLOG_LIFECYCLE_COPY.confirm[action];

  // Handlers
  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      onCancel();
    }
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={action !== null}>
      <AlertDialogContent data-testid="BlogPostLifecycleConfirmDialog">
        <AlertDialogHeader>
          <AlertDialogTitle>{copy?.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {BLOG_LIFECYCLE_COPY.confirm.cancel}
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive hover:bg-destructive/90 text-white"
            onClick={onConfirm}
          >
            {copy?.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
