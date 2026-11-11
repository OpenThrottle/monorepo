import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import AuthSignOut from '../auth.sign-out';

describe('routes/auth.sign-out.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: AuthSignOut, path: '/auth/sign-out' },
    ]);
    const component = render(<Stub initialEntries={['/auth/sign-out']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
