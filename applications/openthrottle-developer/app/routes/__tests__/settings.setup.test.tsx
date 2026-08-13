import * as React from 'react';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import Component from '../settings.setup';

// The table embeds the install/update controls, which open a graphql-ws
// subscription; stub the singleton so the route never reaches for a real socket.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

type LoaderData = {
  agents: Array<{
    backend: string;
    enabled: boolean;
    label: string;
    models: string[];
    version?: string | null;
  }>;
  canManage: boolean;
  installEnabled: boolean;
  scannedAt: string;
};

const renderRoute = (loaderData: LoaderData) => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: () => loaderData,
      path: '/settings/setup',
    },
    { action: () => ({ ok: true }), path: '/resources/agent-setup' },
    { action: () => ({ ok: true }), path: '/resources/agent-enabled' },
  ]);
  return render(<Stub initialEntries={['/settings/setup']} />);
};

describe('routes/settings.setup.tsx', () => {
  test('renders one table row per allowlisted CLI, marking installed vs not-installed', async () => {
    const component = renderRoute({
      agents: [
        {
          backend: 'claude',
          enabled: true,
          label: 'claude-code',
          models: ['opus'],
          version: '2.1.0',
        },
      ],
      canManage: true,
      installEnabled: true,
      scannedAt: '2026-08-12T00:00:00.000Z',
    });

    // All five catalog CLIs render as rows, installed or not.
    const claudeRow = await component.findByTestId(
      'SettingsSetupTableRow-claude',
    );
    expect(within(claudeRow).getByText('Installed')).toBeInTheDocument();
    expect(within(claudeRow).getByText('2.1.0')).toBeInTheDocument();

    // A CLI absent from discovery renders as Not installed.
    const grokRow = component.getByTestId('SettingsSetupTableRow-grok');
    expect(within(grokRow).getByText('Not installed')).toBeInTheDocument();
  });

  test('the install-enabled disclaimer appears exactly once (route-level notice)', async () => {
    const component = renderRoute({
      agents: [],
      canManage: true,
      installEnabled: false,
      scannedAt: '2026-08-12T00:00:00.000Z',
    });

    const disclaimers = await component.findAllByText(
      /OT_AGENT_CLI_INSTALL_ENABLED/,
    );
    expect(disclaimers).toHaveLength(1);
  });

  test('the toolbar filter narrows the visible rows', async () => {
    const user = userEvent.setup();
    const component = renderRoute({
      agents: [
        {
          backend: 'claude',
          enabled: true,
          label: 'claude-code',
          models: ['opus'],
          version: '2.1.0',
        },
      ],
      canManage: true,
      installEnabled: true,
      scannedAt: '2026-08-12T00:00:00.000Z',
    });

    // Everything shows under All; only the installed one under Installed.
    expect(
      await component.findByTestId('SettingsSetupTableRow-grok'),
    ).toBeVisible();
    await user.click(component.getByRole('button', { name: 'Installed' }));
    expect(
      component.queryByTestId('SettingsSetupTableRow-grok'),
    ).not.toBeInTheDocument();
    expect(
      component.getByTestId('SettingsSetupTableRow-claude'),
    ).toBeInTheDocument();
  });

  test('shows the last-checked timestamp from the scan', async () => {
    const component = renderRoute({
      agents: [],
      canManage: true,
      installEnabled: true,
      scannedAt: '2026-08-12T00:00:00.000Z',
    });
    expect(await component.findByText(/Last checked/)).toBeInTheDocument();
  });
});
