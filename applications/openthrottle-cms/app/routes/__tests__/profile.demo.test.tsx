import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import ProfileDemo from '../profile.demo';

describe('routes/profile.demo.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: ProfileDemo, path: '/profile/demo' },
    ]);
    const component = render(<Stub initialEntries={['/profile/demo']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
