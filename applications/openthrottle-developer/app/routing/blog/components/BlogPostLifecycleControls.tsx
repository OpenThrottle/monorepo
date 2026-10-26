import { Button } from '@openthrottle/react-router-shadcn';
import { ArchiveIcon, EyeOffIcon, FileEditIcon } from 'lucide-react';
import * as React from 'react';

import { BlogPostState } from '~/__generated__/graphql';
import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
import { BLOG_LIFECYCLE_ACTIONS } from '~/routing/blog/data/data.lifecycle';
import { useBlogPostLifecycle } from '~/routing/blog/hooks/useBlogPostLifecycle';
import type {
  BlogEditorPost,
  BlogPostLifecycleAction,
} from '~/routing/blog/types';

import { BlogPostLifecycleConfirmDialog } from './BlogPostLifecycleConfirmDialog';
import { BlogPostPublishPopover } from './BlogPostPublishPopover';
import { BlogPostScheduledFor } from './BlogPostScheduledFor';

type ConfirmAction = Extract<
  BlogPostLifecycleAction,
  'archive' | 'moveToDraft' | 'unpublish'
>;

const CONFIRM_ICONS = {
  archive: ArchiveIcon,
  moveToDraft: FileEditIcon,
  unpublish: EyeOffIcon,
} as const;

export interface BlogPostLifecycleControlsProps {
  /** The caller holds `blog:write`; without it nothing renders. */
  readonly canWrite: boolean;
  /** Unsaved edits: publishing would send the last SAVED version. */
  readonly isDirty: boolean;
  readonly post: Pick<BlogEditorPost, 'publishedAt' | 'state'>;
}

/**
 * @description The editor header's lifecycle controls, for `blog:write` only.
 * The set follows the post's state (draft: publish or schedule; scheduled:
 * reschedule or unpublish; live: unpublish or archive; archived: publish again
 * or move to draft). Unpublish, Move to draft and Archive ask for confirmation.
 * Everything is disabled while there are unsaved edits, or an action is running.
 */
export const BlogPostLifecycleControls = (
  props: BlogPostLifecycleControlsProps,
): React.ReactElement | null => {
  const { canWrite, isDirty, post } = props;

  // Hooks
  const lifecycle = useBlogPostLifecycle();
  const [confirming, setConfirming] = React.useState<ConfirmAction | null>(
    null,
  );

  // Setup
  const disabled = isDirty || lifecycle.isPending;
  const actions = BLOG_LIFECYCLE_ACTIONS[post.state];
  const publishedAt =
    post.publishedAt === null || post.publishedAt === undefined
      ? null
      : String(post.publishedAt);

  // Handlers
  const handleConfirm = (): void => {
    if (confirming === 'archive') {
      lifecycle.archive();
    } else if (confirming !== null) {
      lifecycle.unpublish();
    }

    setConfirming(null);
  };

  const renderAction = (action: BlogPostLifecycleAction): React.ReactNode => {
    if (action === 'publish' || action === 'reschedule') {
      return (
        <BlogPostPublishPopover
          action={action}
          disabled={disabled}
          key={action}
          onPublish={lifecycle.publish}
          publishedAt={publishedAt}
        />
      );
    }

    const Icon = CONFIRM_ICONS[action];

    return (
      <Button
        disabled={disabled}
        key={action}
        onClick={() => setConfirming(action)}
        size="sm"
        type="button"
        variant="outline"
      >
        <Icon className="size-4" />
        {BLOG_LIFECYCLE_COPY.actions[action]}
      </Button>
    );
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!canWrite) {
    return null;
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-2"
      data-testid="BlogPostLifecycleControls"
    >
      {post.state === BlogPostState.Scheduled && publishedAt !== null ? (
        <BlogPostScheduledFor publishedAt={publishedAt} />
      ) : null}
      {isDirty ? (
        <span className="text-muted-foreground text-xs">
          {BLOG_LIFECYCLE_COPY.saveFirst}
        </span>
      ) : null}
      {actions.map(renderAction)}
      <BlogPostLifecycleConfirmDialog
        action={confirming}
        onCancel={() => setConfirming(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
};
