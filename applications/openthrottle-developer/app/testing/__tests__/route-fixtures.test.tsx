import * as React from 'react';
import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import {
  renderRoutesStub,
  renderWithMemoryRouter,
} from '~/testing/route-fixtures';

describe('route-fixtures', () => {
  test('renderWithMemoryRouter mounts a memory router tree', () => {
    renderWithMemoryRouter([
      {
        element: <div>memory-router-fixture</div>,
        path: '/',
      },
    ]);

    expect(screen.getByText('memory-router-fixture')).toBeInTheDocument();
  });

  test('renderRoutesStub mounts createRoutesStub output', () => {
    renderRoutesStub(<div>routes-stub-fixture</div>);

    expect(screen.getByText('routes-stub-fixture')).toBeInTheDocument();
  });
});
