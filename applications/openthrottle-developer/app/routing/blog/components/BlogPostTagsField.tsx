import { Label, MultiSelect } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { GetBlogPostEditorQuery } from '~/__generated__/graphql';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostTagsFieldProps {
  readonly error: string | undefined;
  readonly onChange: (tagSlugs: readonly string[]) => void;
  readonly tags: GetBlogPostEditorQuery['blogAdminTags'];
  /** Selected tag slugs. */
  readonly value: readonly string[];
}

/**
 * @description Searchable, keyboard-accessible multi-select over every blog tag.
 * Saving replaces the post's whole tag set with this selection.
 */
export const BlogPostTagsField = (
  props: BlogPostTagsFieldProps,
): React.ReactElement => {
  const { error, onChange, tags, value } = props;

  // Hooks

  // Setup
  const options = tags.map((tag) => ({ label: tag.name, value: tag.slug }));

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-1.5" data-testid="BlogPostTagsField">
      <Label>{BLOG_EDITOR_COPY.tagsLabel}</Label>
      <MultiSelect
        className="min-h-9 py-1.5"
        emptyText={BLOG_EDITOR_COPY.tagsEmpty}
        onChange={onChange}
        options={options}
        placeholder={BLOG_EDITOR_COPY.tagsPlaceholder}
        searchPlaceholder={BLOG_EDITOR_COPY.tagsSearch}
        value={value}
      />
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
