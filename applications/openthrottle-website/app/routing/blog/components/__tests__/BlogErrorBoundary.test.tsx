import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub, data } from 'react-router';
import { describe, expect, test } from 'vitest';

import { BLOG_COPY } from '~/routing/blog/data/data.copy';

import { BlogErrorBoundary } from '../BlogErrorBoundary';

const renderThrowing = (status: number): RenderResult => {
  const RoutesStub = createRoutesStub([
    {
      Component: () => <p>Never rendered</p>,
      ErrorBoundary: BlogErrorBoundary,
      loader: () => {
        throw data(null, { status });
      },
      path: '/',
    },
  ]);

  return render(<RoutesStub />);
};

describe('BlogErrorBoundary Component', () => {
  test('renders the not-found state inside the site chrome for a 404', async () => {
    const component = renderThrowing(404);

    expect(
      await component.findByText(BLOG_COPY.emptyState.notFound.title),
    ).toBeInTheDocument();
    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      component.getByRole('link', {
        name: BLOG_COPY.emptyState.notFound.actionLabel,
      }),
    ).toHaveAttribute('href', '/blog');
  });

  test('falls through to the app error boundary for other statuses', async () => {
    const component = renderThrowing(500);

    expect(
      await component.findByRole('heading', { name: /500/ }),
    ).toBeInTheDocument();
    expect(
      component.queryByText(BLOG_COPY.emptyState.notFound.title),
    ).not.toBeInTheDocument();
  });
});
