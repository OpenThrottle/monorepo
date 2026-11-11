import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SchemasUuidCreate from '../schemas.$uuid.create';

describe('routes/schemas.$uuid.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: SchemasUuidCreate, path: '/schemas/:uuid/create' },
    ]);
    const component = render(
      <Stub initialEntries={['/schemas/test-uuid/create']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
