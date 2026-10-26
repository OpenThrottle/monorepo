import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { GetBlogPostEditorQuery } from '~/__generated__/graphql';
import { BLOG_NO_AUTHOR_VALUE } from '~/routing/blog/config/defaults';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostAuthorFieldProps {
  readonly authors: GetBlogPostEditorQuery['blogAdminAuthors'];
  readonly error: string | undefined;
  /** `''` clears the byline. */
  readonly onChange: (authorSlug: string) => void;
  /** The selected author's slug, `''` for no byline. */
  readonly value: string;
}

/**
 * @description Byline picker: every blog author by display name, plus "No
 * byline". An empty string stands for no author.
 */
export const BlogPostAuthorField = (
  props: BlogPostAuthorFieldProps,
): React.ReactElement => {
  const { authors, error, onChange, value } = props;

  // Hooks

  // Setup
  const id = 'blog-post-authorSlug';
  const errorId = `${id}-error`;

  // Handlers
  const handleValueChange = (next: string): void => {
    onChange(next === BLOG_NO_AUTHOR_VALUE ? '' : next);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col gap-1.5" data-testid="BlogPostAuthorField">
      <Label htmlFor={id}>{BLOG_EDITOR_COPY.authorLabel}</Label>
      <Select
        onValueChange={handleValueChange}
        value={value === '' ? BLOG_NO_AUTHOR_VALUE : value}
      >
        <SelectTrigger
          aria-describedby={error ? errorId : undefined}
          aria-invalid={error ? true : undefined}
          className="w-full"
          id={id}
        >
          <SelectValue placeholder={BLOG_EDITOR_COPY.noAuthor} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={BLOG_NO_AUTHOR_VALUE}>
            {BLOG_EDITOR_COPY.noAuthor}
          </SelectItem>
          {authors.map((author) => (
            <SelectItem key={author.slug} value={author.slug}>
              {author.displayName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-destructive text-xs" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};
