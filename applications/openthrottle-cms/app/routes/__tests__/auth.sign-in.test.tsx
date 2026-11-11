import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import AuthSignIn from '../auth.sign-in';

describe('routes/auth.sign-in.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: AuthSignIn, path: '/auth/sign-in' },
    ]);
    const component = render(<Stub initialEntries={['/auth/sign-in']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
