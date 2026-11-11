import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import AuthSignUp from '../auth.sign-up';

describe('routes/auth.sign-up.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: AuthSignUp, path: '/auth/sign-up' },
    ]);
    const component = render(<Stub initialEntries={['/auth/sign-up']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
