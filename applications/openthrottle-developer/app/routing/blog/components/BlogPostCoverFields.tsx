import * as React from 'react';

import { BlogPostCoverPreview } from '~/routing/blog/components/BlogPostCoverPreview';
import { BlogPostTextField } from '~/routing/blog/components/BlogPostTextField';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogPostEditorValues,
  BlogPostFieldErrors,
  BlogPostTextFieldName,
} from '~/routing/blog/types';

export interface BlogPostCoverFieldsProps {
  readonly errors: BlogPostFieldErrors;
  readonly onChange: (field: BlogPostTextFieldName, value: string) => void;
  readonly values: Pick<
    BlogPostEditorValues,
    'coverImageAlt' | 'coverImageUrl'
  >;
}

/**
 * @description Cover image URL and alt text, beside a live thumbnail. Alt text
 * is required whenever a URL is set, the same rule the server enforces.
 */
export const BlogPostCoverFields = (
  props: BlogPostCoverFieldsProps,
): React.ReactElement => {
  const { errors, onChange, values } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="grid gap-3 sm:grid-cols-[1fr_auto]"
      data-testid="BlogPostCoverFields"
    >
      <div className="flex flex-col gap-3">
        <BlogPostTextField
          error={errors.coverImageUrl}
          field="coverImageUrl"
          label={BLOG_EDITOR_COPY.coverUrlLabel}
          onChange={onChange}
          placeholder={BLOG_EDITOR_COPY.coverUrlPlaceholder}
          value={values.coverImageUrl}
        />
        <BlogPostTextField
          error={errors.coverImageAlt}
          field="coverImageAlt"
          hint={BLOG_EDITOR_COPY.coverAltHint}
          label={BLOG_EDITOR_COPY.coverAltLabel}
          onChange={onChange}
          value={values.coverImageAlt}
        />
      </div>
      <div className="flex items-start sm:pt-5">
        <BlogPostCoverPreview
          alt={values.coverImageAlt}
          key={values.coverImageUrl}
          url={values.coverImageUrl}
        />
      </div>
    </div>
  );
};
