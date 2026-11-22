import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import SettingsConnections from '../settings.connections';

describe('routes/settings.connections.tsx', () => {
  test('renders the heading and the connections table', async () => {
    const Stub = createRoutesStub([
      {
        Component: SettingsConnections,
        loader: () => ({ connections: [] }),
        path: '/settings/connections',
      },
    ]);
    const component = render(
      <Stub initialEntries={['/settings/connections']} />,
    );

    expect(
      await component.findByRole('heading', { level: 1 }),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsConnectionsTable'),
    ).toBeInTheDocument();
  });
});
