import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SchemasCreate from '../schemas.create';

describe('routes/schemas.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: SchemasCreate, path: '/schemas/create' },
    ]);
    const component = render(<Stub initialEntries={['/schemas/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
