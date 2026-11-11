import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import ComponentsCreate from '../components.create';

describe('routes/components.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: ComponentsCreate, path: '/components/create' },
    ]);
    const component = render(<Stub initialEntries={['/components/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
