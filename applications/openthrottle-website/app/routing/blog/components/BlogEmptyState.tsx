import {
  Button,
  cn,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Link } from 'react-router';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';
import { BLOG_BASE_PATH } from '~/routing/blog/utils/blog-urls';

export interface BlogEmptyStateProps {
  readonly className?: string;
  /**
   * `tag` is the filtered view and `notFound` the 404 body: both offer a way
   * back to the full list.
   */
  readonly kind: 'all' | 'notFound' | 'tag';
}

export const BlogEmptyState = (
  props: BlogEmptyStateProps,
): React.ReactElement => {
  const { className, kind } = props;

  // Hooks

  // Setup
  const { actionLabel, description, title } = BLOG_COPY.emptyState[kind];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty
      className={cn('border py-16', className)}
      data-testid="BlogEmptyState"
    >
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actionLabel ? (
        <EmptyContent>
          <Button asChild={true} variant="outline">
            <Link to={BLOG_BASE_PATH}>{actionLabel}</Link>
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  );
};
