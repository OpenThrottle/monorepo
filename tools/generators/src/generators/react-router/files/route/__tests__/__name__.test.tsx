import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import <%= namePascal %> from '../<%= name %>';

describe('routes/<%= name %>.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: <%= namePascal %>, path: '<%= routePath %>' },
    ]);
    const component = render(<Stub initialEntries={['<%= routeEntry %>']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
