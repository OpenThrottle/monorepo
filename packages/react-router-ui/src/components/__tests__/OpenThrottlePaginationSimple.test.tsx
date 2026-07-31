import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { createRoutesStub } from 'react-router';
import { OpenThrottlePaginationSimple } from '../OpenThrottlePaginationSimple';
import { render } from '@testing-library/react';
import type { OpenThrottlePaginationSimpleProps } from '../OpenThrottlePaginationSimple';
import type { RenderResult } from '@testing-library/react';

const renderPagination = (
  props: OpenThrottlePaginationSimpleProps,
  initialPath = '/',
): RenderResult => {
  const Component = () => <OpenThrottlePaginationSimple {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub initialEntries={[initialPath]} />);
};

describe('OpenThrottlePaginationSimple Component', () => {
  test('derives page count from total and limit', () => {
    const component = renderPagination({
      limit: 10,
      page: 1,
      resultLabel: 'jobs',
      total: 100,
    });

    expect(component.getByTestId('queue-jobs-pagination')).toBeInTheDocument();
    expect(component.getByText('Page 1 of 10 · 100 jobs')).toBeInTheDocument();
    expect(component.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(component.getByRole('link', { name: 'Next' })).toHaveAttribute(
      'href',
      expect.stringContaining('page=2'),
    );
  });

  test('enables Previous and disables Next on the last page', () => {
    const component = renderPagination({
      basePath: '/queues/plans',
      limit: 10,
      page: 10,
      total: 100,
    });

    expect(component.getByRole('link', { name: 'Previous' })).toHaveAttribute(
      'href',
      expect.stringContaining('page=9'),
    );
    expect(component.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  test('preserves existing query params on page links', () => {
    const component = renderPagination(
      { basePath: '/queues/plans', limit: 10, page: 1, total: 100 },
      '/?state=failed&q=abc',
    );

    const next = component.getByRole('link', { name: 'Next' });
    expect(next).toHaveAttribute(
      'href',
      expect.stringContaining('state=failed'),
    );
    expect(next).toHaveAttribute('href', expect.stringContaining('q=abc'));
  });

  test('renders nothing when everything fits on one page', () => {
    const component = renderPagination({ limit: 10, page: 1, total: 4 });

    expect(
      component.queryByTestId('queue-jobs-pagination'),
    ).not.toBeInTheDocument();
  });
});
