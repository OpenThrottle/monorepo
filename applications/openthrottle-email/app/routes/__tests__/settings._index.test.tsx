import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Route, { meta } from '../settings._index';
import { SITE_TITLE } from '~/global/config/settings';

describe('routes/settings._index.tsx', () => {
  test('returns site title from meta', () => {
    // @ts-expect-error - we're testing the function
    expect(meta({})).toEqual([{ title: SITE_TITLE }]);
  });

  test('renders coming soon copy', () => {
    const RoutesStub = createRoutesStub([
      { Component: (props: any) => <Route {...props} />, path: '/' },
    ]);
    const component = render(<RoutesStub />);

    expect(component.getByText('Coming soon...')).toBeInTheDocument();
  });
});
