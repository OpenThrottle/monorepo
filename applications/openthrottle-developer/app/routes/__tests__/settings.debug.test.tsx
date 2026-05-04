import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { SettingsDebugPanel } from '~/routing/settings/components/SettingsDebugPanel';

describe('routes/settings.debug.tsx', () => {
  test('SettingsDebugPanel surfaces diagnostics sections', () => {
    const router = createMemoryRouter(
      [
        {
          element: (
            <SettingsDebugPanel
              envSnapshot={{ APP_URL: 'http://localhost:6020' }}
              graphQL={{
                latencyMs: 10,
                serverHealth: {
                  __typename: 'ServerHealthObject',
                  api: 'ok',
                  database: 'ok',
                  redis: 'ok',
                  websocket: 'ok',
                },
                status: 'ok',
              }}
            />
          ),
          path: '/',
        },
      ],
      { initialEntries: ['/'] },
    );

    render(<RouterProvider router={router} />);

    expect(screen.getByText(/Feature flags/i)).toBeInTheDocument();
    expect(screen.getByText(/Sanitized env snapshot/i)).toBeInTheDocument();
    expect(screen.getByText(/GraphQL endpoint health/i)).toBeInTheDocument();
  });
});
