import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Libraries from '../libraries._index';

describe('routes/libraries._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: Libraries, path: '/libraries' },
    ]);
    const component = render(<Stub initialEntries={['/libraries']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
