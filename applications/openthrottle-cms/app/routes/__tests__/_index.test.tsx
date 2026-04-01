import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Route, { meta, ErrorBoundary } from '../_index';
import { SITE_TITLE } from '~/global/config/settings';

describe('routes/_index.tsx', () => {
  test('returns site title from meta', () => {
    // @ts-expect-error - we're testing the function
    expect(meta({})).toEqual([{ title: SITE_TITLE }]);
  });

  test('renders coming soon content', () => {
    const RoutesStub = createRoutesStub([
      // @ts-expect-error - we're testing the function
      { Component: () => <Route {...{}} />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(
      component.getByRole('heading', { name: /coming soon/i }),
    ).toBeInTheDocument();
  });

  test('exports global error boundary for route errors', () => {
    expect(ErrorBoundary).toBeDefined();
  });
});
