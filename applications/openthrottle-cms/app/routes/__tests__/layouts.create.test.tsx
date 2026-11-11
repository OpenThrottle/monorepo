import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LayoutsCreate from '../layouts.create';

describe('routes/layouts.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: LayoutsCreate, path: '/layouts/create' },
    ]);
    const component = render(<Stub initialEntries={['/layouts/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
