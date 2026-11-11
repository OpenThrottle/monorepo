import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Auth from '../auth._index';

describe('routes/auth._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([{ Component: Auth, path: '/auth' }]);
    const component = render(<Stub initialEntries={['/auth']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
