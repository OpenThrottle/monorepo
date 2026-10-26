import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDownIcon } from 'lucide-react';
import * as React from 'react';

import type { GetBlogPostEditorQuery } from '~/__generated__/graphql';
import { BlogPostAuthorField } from '~/routing/blog/components/BlogPostAuthorField';
import { BlogPostCoverFields } from '~/routing/blog/components/BlogPostCoverFields';
import { BlogPostSeoFields } from '~/routing/blog/components/BlogPostSeoFields';
import { BlogPostTagsField } from '~/routing/blog/components/BlogPostTagsField';
import { BlogPostTextField } from '~/routing/blog/components/BlogPostTextField';
import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';
import type {
  BlogPostEditorValues,
  BlogPostFieldChangeHandler,
  BlogPostFieldErrors,
} from '~/routing/blog/types';

export interface BlogPostMetadataPanelProps {
  readonly authors: GetBlogPostEditorQuery['blogAdminAuthors'];
  readonly errors: BlogPostFieldErrors;
  readonly onFieldChange: BlogPostFieldChangeHandler;
  readonly tags: GetBlogPostEditorQuery['blogAdminTags'];
  readonly values: BlogPostEditorValues;
}

/**
 * @description Everything about a post except its body, in a panel that
 * collapses so the Markdown editor can take the full height: title, slug,
 * excerpt, author, tags, cover image and SEO overrides.
 */
export const BlogPostMetadataPanel = (
  props: BlogPostMetadataPanelProps,
): React.ReactElement => {
  const { authors, errors, onFieldChange, tags, values } = props;

  // Hooks
  const [open, setOpen] = React.useState(true);

  // Setup

  // Handlers
  const handleAuthorChange = (authorSlug: string): void =>
    onFieldChange('authorSlug', authorSlug);

  const handleTagsChange = (tagSlugs: readonly string[]): void =>
    onFieldChange('tagSlugs', tagSlugs);

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="bg-card border-border rounded-lg border"
      data-testid="BlogPostMetadataPanel"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger
        aria-label={BLOG_EDITOR_COPY.detailsToggle}
        className="hover:bg-muted/50 flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors"
      >
        <span className="text-sm font-medium">
          {BLOG_EDITOR_COPY.detailsHeading}
        </span>
        <ChevronDownIcon
          aria-hidden="true"
          className="text-muted-foreground size-4 transition-transform duration-200 data-[open=true]:rotate-180"
          data-open={open}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-border flex flex-col gap-5 border-t px-4 pt-4 pb-5">
        <BlogPostTextField
          error={errors.title}
          field="title"
          inputClassName="text-base font-medium"
          label={BLOG_EDITOR_COPY.titleLabel}
          onChange={onFieldChange}
          value={values.title}
        />
        <BlogPostTextField
          error={errors.slug}
          field="slug"
          inputClassName="font-mono text-xs"
          label={BLOG_EDITOR_COPY.slugLabel}
          onChange={onFieldChange}
          prefix={BLOG_EDITOR_COPY.slugPrefix}
          value={values.slug}
        />
        <BlogPostTextField
          error={errors.excerpt}
          field="excerpt"
          hint={BLOG_EDITOR_COPY.excerptHint}
          label={BLOG_EDITOR_COPY.excerptLabel}
          multiline={true}
          onChange={onFieldChange}
          value={values.excerpt}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <BlogPostAuthorField
            authors={authors}
            error={errors.authorSlug}
            onChange={handleAuthorChange}
            value={values.authorSlug}
          />
          <BlogPostTagsField
            error={errors.tagSlugs}
            onChange={handleTagsChange}
            tags={tags}
            value={values.tagSlugs}
          />
        </div>
        <BlogPostCoverFields
          errors={errors}
          onChange={onFieldChange}
          values={values}
        />
        <BlogPostSeoFields
          errors={errors}
          onChange={onFieldChange}
          values={values}
        />
      </CollapsibleContent>
    </Collapsible>
  );
};
