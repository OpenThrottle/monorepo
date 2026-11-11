import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LibrariesLibraryUUID from '../libraries.$libraryUUID._index';

describe('routes/libraries.$libraryUUID._index.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      { Component: LibrariesLibraryUUID, path: '/libraries/:libraryUUID' },
    ]);
    const component = render(
      <Stub initialEntries={['/libraries/test-libraryUUID']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
