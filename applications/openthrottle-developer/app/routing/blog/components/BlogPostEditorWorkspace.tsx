import * as React from 'react';

import type { GetBlogPostEditorQuery } from '~/__generated__/graphql';
import { BlogPostMarkdownEditor } from '~/routing/blog/components/BlogPostMarkdownEditor';
import { BlogPostMetadataPanel } from '~/routing/blog/components/BlogPostMetadataPanel';
import { BlogPostPreview } from '~/routing/blog/components/BlogPostPreview';
import type {
  BlogPostEditorValues,
  BlogPostFieldChangeHandler,
  BlogPostFieldErrors,
} from '~/routing/blog/types';

export interface BlogPostEditorWorkspaceProps {
  readonly authors: GetBlogPostEditorQuery['blogAdminAuthors'];
  readonly errors: BlogPostFieldErrors;
  readonly onFieldChange: BlogPostFieldChangeHandler;
  readonly postId: string;
  /** Preview only: no metadata form, no Markdown editor. */
  readonly readOnly: boolean;
  readonly tags: GetBlogPostEditorQuery['blogAdminTags'];
  readonly values: BlogPostEditorValues;
}

/**
 * @description The split view. Left: the collapsible metadata panel above the
 * Markdown editor. Right: the live preview, sticky on wide screens. The two
 * columns stack below `lg`. Read-only renders the preview alone.
 */
export const BlogPostEditorWorkspace = (
  props: BlogPostEditorWorkspaceProps,
): React.ReactElement => {
  const { authors, errors, onFieldChange, postId, readOnly, tags, values } =
    props;

  // Hooks

  // Setup

  // Handlers
  const handleBodyChange = (bodyMarkdown: string): void =>
    onFieldChange('bodyMarkdown', bodyMarkdown);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (readOnly) {
    return (
      <div data-testid="BlogPostEditorWorkspace">
        <BlogPostPreview className="mx-auto max-w-4xl" values={values} />
      </div>
    );
  }

  return (
    <div
      className="grid items-start gap-6 lg:grid-cols-2"
      data-testid="BlogPostEditorWorkspace"
    >
      <div className="flex min-w-0 flex-col gap-4">
        <BlogPostMetadataPanel
          authors={authors}
          errors={errors}
          onFieldChange={onFieldChange}
          tags={tags}
          values={values}
        />
        <div className="bg-card border-border h-[clamp(420px,calc(100dvh-14rem),900px)] overflow-hidden rounded-lg border">
          <BlogPostMarkdownEditor
            onChange={handleBodyChange}
            postId={postId}
            value={values.bodyMarkdown}
          />
        </div>
      </div>
      <BlogPostPreview
        className="min-w-0 lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto"
        values={values}
      />
    </div>
  );
};
