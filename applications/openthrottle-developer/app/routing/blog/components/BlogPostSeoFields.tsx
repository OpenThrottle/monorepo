import * as React from 'react';

import { BlogPostTextField } from '~/routing/blog/components/BlogPostTextField';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogPostEditorValues,
  BlogPostFieldErrors,
  BlogPostTextFieldName,
} from '~/routing/blog/types';

export interface BlogPostSeoFieldsProps {
  readonly errors: BlogPostFieldErrors;
  readonly onChange: (field: BlogPostTextFieldName, value: string) => void;
  readonly values: Pick<BlogPostEditorValues, 'seoDescription' | 'seoTitle'>;
}

/**
 * @description Search and social-sharing overrides. Both are optional; empty
 * values fall back to the post title and excerpt.
 */
export const BlogPostSeoFields = (
  props: BlogPostSeoFieldsProps,
): React.ReactElement => {
  const { errors, onChange, values } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <fieldset className="flex flex-col gap-3" data-testid="BlogPostSeoFields">
      <legend className="text-muted-foreground mb-1 text-[11px] font-semibold tracking-[0.08em] uppercase">
        {BLOG_EDITOR_COPY.seoHeading}
      </legend>
      <BlogPostTextField
        error={errors.seoTitle}
        field="seoTitle"
        label={BLOG_EDITOR_COPY.seoTitleLabel}
        onChange={onChange}
        value={values.seoTitle}
      />
      <BlogPostTextField
        error={errors.seoDescription}
        field="seoDescription"
        hint={BLOG_EDITOR_COPY.seoHint}
        label={BLOG_EDITOR_COPY.seoDescriptionLabel}
        multiline={true}
        onChange={onChange}
        value={values.seoDescription}
      />
    </fieldset>
  );
};
