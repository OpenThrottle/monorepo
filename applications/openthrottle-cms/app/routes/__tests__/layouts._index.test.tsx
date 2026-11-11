import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import Layouts from '../layouts._index';

describe('routes/layouts._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([{ Component: Layouts, path: '/layouts' }]);
    const component = render(<Stub initialEntries={['/layouts']} />);

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
