import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LibrariesLibraryUUIDComponentsCreate from '../libraries.$libraryUUID.components.create';

describe('routes/libraries.$libraryUUID.components.create.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      {
        Component: LibrariesLibraryUUIDComponentsCreate,
        path: '/libraries/:libraryUUID/components/create',
      },
    ]);
    const component = render(
      <Stub
        initialEntries={['/libraries/test-libraryUUID/components/create']}
      />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
