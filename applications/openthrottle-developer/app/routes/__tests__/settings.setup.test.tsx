import * as React from 'react';
import { render, within } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import Component from '../settings.setup';

type LoaderData = {
  agents: Array<{
    backend: string;
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
  ]);
  return render(<Stub initialEntries={['/settings/setup']} />);
};

describe('routes/settings.setup.tsx', () => {
  test('renders one card per allowlisted CLI, marking installed vs not-installed', async () => {
    const component = renderRoute({
      agents: [
        {
          backend: 'claude',
          label: 'claude-code',
          models: ['opus'],
          version: '2.1.0',
        },
      ],
      canManage: true,
      installEnabled: true,
      scannedAt: '2026-08-12T00:00:00.000Z',
    });

    const cards = await component.findAllByTestId('SettingsSetupCliCard');
    // All five catalog CLIs render, installed or not.
    expect(cards).toHaveLength(5);

    const claude = cards.find((card) =>
      within(card).queryByText('Claude Code'),
    );
    expect(claude).toBeDefined();
    expect(within(claude!).getByText('Installed')).toBeInTheDocument();
    expect(within(claude!).getByText('2.1.0')).toBeInTheDocument();

    // A CLI absent from discovery renders as Not installed.
    const grok = cards.find((card) => within(card).queryByText('Grok'));
    expect(grok).toBeDefined();
    expect(within(grok!).getByText('Not installed')).toBeInTheDocument();
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
