import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import FragmentsUuid from '../fragments.$uuid';

describe('routes/fragments.$uuid.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: FragmentsUuid, path: '/fragments/:uuid' },
    ]);
    const component = render(
      <Stub initialEntries={['/fragments/test-uuid']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
