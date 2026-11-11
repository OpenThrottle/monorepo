import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LibrariesCreate from '../libraries.create';

describe('routes/libraries.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: LibrariesCreate, path: '/libraries/create' },
    ]);
    const component = render(<Stub initialEntries={['/libraries/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
