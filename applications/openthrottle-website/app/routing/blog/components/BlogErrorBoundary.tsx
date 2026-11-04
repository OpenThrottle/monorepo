import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import * as React from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { BlogEmptyState } from './BlogEmptyState';
import { BlogPageShell } from './BlogPageShell';

export interface BlogErrorBoundaryProps {}

/**
 * Shared `ErrorBoundary` for the blog routes. A 404 (unknown or non-public post
 * or tag) renders a friendly not-found state inside the site chrome; anything
 * else falls through to the app-wide error boundary.
 */
export const BlogErrorBoundary = (
  _props: BlogErrorBoundaryProps,
): React.ReactElement => {
  // Hooks
  const error = useRouteError();

  // Setup
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (!isNotFound) {
    return <GlobalErrorBoundary />;
  }

  return (
    <BlogPageShell>
      <BlogEmptyState kind="notFound" />
    </BlogPageShell>
  );
};
