import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LayoutsLayoutUUID from '../layouts.$layoutUUID._index';

describe('routes/layouts.$layoutUUID._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: LayoutsLayoutUUID, path: '/layouts/:layoutUUID' },
    ]);
    const component = render(
      <Stub initialEntries={['/layouts/test-layoutUUID']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
