import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Fragments from '../fragments._index';

describe('routes/fragments._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: Fragments, path: '/fragments' },
    ]);
    const component = render(<Stub initialEntries={['/fragments']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
