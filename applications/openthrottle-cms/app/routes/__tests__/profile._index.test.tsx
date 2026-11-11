import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Profile from '../profile._index';

describe('routes/profile._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([{ Component: Profile, path: '/profile' }]);
    const component = render(<Stub initialEntries={['/profile']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
