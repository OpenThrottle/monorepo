import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LibrariesLibraryUUIDComponentsComponentUUID from '../libraries.$libraryUUID.components.$componentUUID';

describe('routes/libraries.$libraryUUID.components.$componentUUID.tsx', () => {
  test('renders the page heading', async () => {
    const Stub = createRoutesStub([
      {
        Component: LibrariesLibraryUUIDComponentsComponentUUID,
        path: '/libraries/:libraryUUID/components/:componentUUID',
      },
    ]);
    const component = render(
      <Stub
        initialEntries={[
          '/libraries/test-libraryUUID/components/test-componentUUID',
        ]}
      />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
  });
});
