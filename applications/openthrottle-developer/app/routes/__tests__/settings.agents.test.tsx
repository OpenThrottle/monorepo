import { ALL_DRIVERS } from '@openthrottle/openthrottle-drivers';
import { render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import Component from '../settings.agents';

// The table embeds the install/update controls, which open a graphql-ws
// subscription; stub the singleton so the route never reaches for a real socket.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

type LoaderData = {
  agents: Array<{
    auth?: { warning: string | null } | null;
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

const renderRoute = (
  loaderData: LoaderData,
  setupActionResult: unknown = { ok: true },
) => {
  const Stub = createRoutesStub([
    {
      Component,
      loader: () => loaderData,
      path: '/settings/agents',
    },
    { action: () => setupActionResult, path: '/resources/agent-setup' },
    { action: () => ({ ok: true }), path: '/resources/agent-enabled' },
  ]);
  return render(<Stub initialEntries={['/settings/agents']} />);
};

describe('routes/settings.agents.tsx', () => {
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

    // EVERY registered driver renders as a row, installed or not. Asserted against
    // ALL_DRIVERS rather than a hardcoded count: Antigravity shipped in the registry and was
    // missing from this table for exactly as long as nobody re-counted the rows by hand.
    const claudeRow = await component.findByTestId(
      'SettingsAgentsTableRow-claude',
    );
    for (const driver of ALL_DRIVERS) {
      expect(
        component.getByTestId(`SettingsAgentsTableRow-${driver.id}`),
      ).toBeInTheDocument();
    }
    expect(within(claudeRow).getByText('Installed')).toBeInTheDocument();
    expect(within(claudeRow).getByText('2.1.0')).toBeInTheDocument();

    // A CLI absent from discovery renders as Not installed.
    const grokRow = component.getByTestId('SettingsAgentsTableRow-grok');
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
      await component.findByTestId('SettingsAgentsTableRow-grok'),
    ).toBeVisible();
    await user.click(component.getByRole('button', { name: 'Installed' }));
    expect(
      component.queryByTestId('SettingsAgentsTableRow-grok'),
    ).not.toBeInTheDocument();
    expect(
      component.getByTestId('SettingsAgentsTableRow-claude'),
    ).toBeInTheDocument();
  });

  test('shows the claude credential warning prominently when an API key overrides the subscription', async () => {
    const component = renderRoute({
      agents: [
        {
          auth: {
            warning: `ANTHROPIC_API_KEY is set, so Claude runs bill the API key.`,
          },
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

    const alert = await component.findByTestId(
      'SettingsAgentsAuthWarning-claude',
    );
    expect(alert).toHaveTextContent('ANTHROPIC_API_KEY is set');
  });

  test('starting an update opens the setup log dialog and keeps the row compact', async () => {
    const user = userEvent.setup();
    const component = renderRoute(
      {
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
      },
      {
        backend: 'claude',
        disabled: false,
        errorMessage: null,
        mode: 'update',
        runId: 'run-1',
      },
    );

    const claudeRow = await component.findByTestId(
      'SettingsAgentsTableRow-claude',
    );
    await user.click(within(claudeRow).getByRole('button', { name: 'Update' }));

    const dialog = await component.findByRole('dialog');
    expect(within(dialog).getByRole('heading')).toHaveTextContent(/^Updating /);
    // The log lives in the dialog, never inline in the table row.
    expect(
      within(claudeRow).queryByTestId('SettingsAgentsCliControlsLog'),
    ).not.toBeInTheDocument();

    // Closing the dialog (which does not cancel the run) exposes View log.
    await user.keyboard('{Escape}');
    expect(
      within(claudeRow).getByRole('button', { name: 'View log' }),
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
