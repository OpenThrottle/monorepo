import { describe, expect, test } from 'vitest';
import { screen } from '@testing-library/react';
import { SettingsDebugPanel } from '~/routing/settings/components/SettingsDebugPanel';
import { VITE_DEVTOOLS_DOC_QUICK_REF_HREF } from '~/routing/settings/utils/settings-docs-links';
import { renderWithMemoryRouter } from '~/testing/route-fixtures';

describe('routes/settings.debug.tsx', () => {
  test('SettingsDebugPanel surfaces diagnostics sections', () => {
    renderWithMemoryRouter([
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
    ]);

    expect(
      screen.getByText(/Client-side diagnostics for this shell/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Feature flags/i)).toBeInTheDocument();
    expect(screen.getByText(/Sanitized env snapshot/i)).toBeInTheDocument();
    expect(
      screen.getByText(/React Router \/ Vite devtools/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Local dev: ports, hosts & API URLs/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Storage: local & session/i)).toBeInTheDocument();
    expect(screen.getByText(/GraphQL endpoint health/i)).toBeInTheDocument();
  });

  test('Vite devtools card links to quick reference doc anchor', () => {
    renderWithMemoryRouter([
      {
        element: (
          <SettingsDebugPanel
            envSnapshot={{}}
            graphQL={{
              error: 'x',
              latencyMs: 0,
              status: 'error',
            }}
          />
        ),
        path: '/',
      },
    ]);

    const link = screen.getByRole('link', {
      name: /quick reference \(when to enable what\)/i,
    });
    expect(link).toHaveAttribute('href', VITE_DEVTOOLS_DOC_QUICK_REF_HREF);
  });
});
