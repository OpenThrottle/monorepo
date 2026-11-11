import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LayoutsLayoutUUIDFragmentUUID from '../layouts.$layoutUUID.$fragmentUUID';

describe('routes/layouts.$layoutUUID.$fragmentUUID.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      {
        Component: LayoutsLayoutUUIDFragmentUUID,
        path: '/layouts/:layoutUUID/:fragmentUUID',
      },
    ]);
    const component = render(
      <Stub initialEntries={['/layouts/test-layoutUUID/test-fragmentUUID']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
