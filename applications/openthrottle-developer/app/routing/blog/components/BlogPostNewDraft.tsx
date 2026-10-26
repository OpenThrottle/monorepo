import { Button, Spinner } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { FilePlusIcon } from 'lucide-react';
import * as React from 'react';
import { Form, useNavigation } from 'react-router';

import { BLOG_NEW_COPY } from '~/routing/blog/data/data.copy';

export interface BlogPostNewDraftProps {
  /** Why the last attempt failed, if it did. */
  readonly error: string | null;
}

/**
 * @description `/blog/new` reached by a plain link (e.g. the empty-state call
 * to action): one button that POSTs to create the draft. Creating on GET would
 * let a prefetch or a reload create posts.
 */
export const BlogPostNewDraft = (
  props: BlogPostNewDraftProps,
): React.ReactElement => {
  const { error } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const isCreating = navigation.state === 'submitting';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className="bg-card border-border mx-auto flex max-w-lg flex-col gap-4 rounded-lg border p-6"
      data-testid="BlogPostNewDraft"
    >
      <GlobalHeading
        heading="h1"
        icon={FilePlusIcon}
        title={BLOG_NEW_COPY.pageTitle}
      />
      <p className="text-muted-foreground text-sm">
        {BLOG_NEW_COPY.description}
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
      <Form method="post">
        <Button disabled={isCreating} type="submit">
          {isCreating ? <Spinner /> : null}
          {isCreating ? BLOG_NEW_COPY.creating : BLOG_NEW_COPY.createDraft}
        </Button>
      </Form>
    </div>
  );
};
