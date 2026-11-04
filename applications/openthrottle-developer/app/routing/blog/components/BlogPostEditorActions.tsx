import { Button, Kbd, Spinner } from '@openthrottle/react-router-shadcn';
import { CheckIcon, SaveIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostEditorActionsProps {
  readonly canSave: boolean;
  readonly isDirty: boolean;
  readonly isSaved: boolean;
  readonly isSaving: boolean;
  /** The publish / schedule / unpublish / archive controls; `null` hides them. */
  readonly lifecycle: React.ReactNode;
  readonly onSave: () => void;
  /** A save failure that belongs to no field. */
  readonly saveError: string | null;
}

/**
 * @description The editor header's action area: save status and "Save draft"
 * (also ⌘S), beside the lifecycle controls handed in as `lifecycle`.
 */
export const BlogPostEditorActions = (
  props: BlogPostEditorActionsProps,
): React.ReactElement => {
  const { canSave, isDirty, isSaved, isSaving, lifecycle, onSave, saveError } =
    props;

  // Hooks

  // Setup
  const status = isSaving
    ? BLOG_EDITOR_COPY.saving
    : isDirty
      ? BLOG_EDITOR_COPY.unsaved
      : isSaved
        ? BLOG_EDITOR_COPY.saved
        : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-3"
      data-testid="BlogPostEditorActions"
    >
      {saveError ? (
        <p className="text-destructive max-w-xs text-xs" role="alert">
          {saveError}
        </p>
      ) : null}
      {status ? (
        <span
          aria-live="polite"
          className="text-muted-foreground flex items-center gap-1.5 text-xs"
          data-dirty={isDirty}
        >
          {isSaved && !isDirty ? <CheckIcon className="size-3.5" /> : null}
          {isDirty && !isSaving ? (
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-amber-500"
            />
          ) : null}
          {status}
        </span>
      ) : null}
      {lifecycle}
      <Button disabled={!canSave} onClick={onSave} size="sm" type="button">
        {isSaving ? <Spinner /> : <SaveIcon className="size-4" />}
        {BLOG_EDITOR_COPY.save}
        <Kbd className="bg-primary-foreground/15 text-primary-foreground ml-1">
          {BLOG_EDITOR_COPY.saveShortcut}
        </Kbd>
      </Button>
    </div>
  );
};
