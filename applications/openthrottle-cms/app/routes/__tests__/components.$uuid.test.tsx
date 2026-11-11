import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import ComponentsUuid from '../components.$uuid';

describe('routes/components.$uuid.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: ComponentsUuid, path: '/components/:uuid' },
    ]);
    const component = render(
      <Stub initialEntries={['/components/test-uuid']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
