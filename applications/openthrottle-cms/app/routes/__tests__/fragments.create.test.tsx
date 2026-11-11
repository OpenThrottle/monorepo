import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import FragmentsCreate from '../fragments.create';

describe('routes/fragments.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: FragmentsCreate, path: '/fragments/create' },
    ]);
    const component = render(<Stub initialEntries={['/fragments/create']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
