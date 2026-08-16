import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import { TooltipProvider } from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { SettingsAgentsTable } from '../SettingsAgentsTable';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

// The embedded install/update controls open a graphql-ws subscription; stub the
// singleton so the table never reaches for a real socket.
vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const installed: AgentCliStatus = {
  backend: 'cursor',
  enabled: true,
  installUrl: 'https://cursor.com/install',
  installed: true,
  label: 'Cursor Agent',
  modelOptions: [
    { enabled: true, favorite: false, model: 'auto' },
    { enabled: true, favorite: false, model: 'gpt-5.2' },
    { enabled: true, favorite: false, model: 'sonnet' },
  ],
  models: ['auto', 'gpt-5.2', 'sonnet'],
  version: '2026.06.15',
};

const disabledAgent: AgentCliStatus = {
  backend: 'claude',
  enabled: false,
  installUrl: 'https://claude.ai/install.sh',
  installed: true,
  label: 'Claude Code',
  modelOptions: [{ enabled: false, favorite: false, model: 'opus' }],
  models: ['opus'],
  version: '2.1.0',
};

const renderTable = (statuses: readonly AgentCliStatus[]) => {
  const Component = () => (
    <TooltipProvider>
      <SettingsAgentsTable
        canManage={true}
        installEnabled={true}
        statuses={statuses}
      />
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { action: () => ({ ok: true }), path: '/resources/agent-setup' },
    { action: () => ({ ok: true }), path: '/resources/agent-enabled' },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsTable', () => {
  test('renders one row per status', () => {
    const component = renderTable([installed, disabledAgent]);
    expect(
      component.getByTestId('SettingsAgentsTableRow-cursor'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsAgentsTableRow-claude'),
    ).toBeInTheDocument();
  });

  test('renders the empty state when there are no statuses', () => {
    const component = renderTable([]);
    expect(component.getByText('No agent CLIs to show.')).toBeInTheDocument();
  });

  test('models are compact (a count) and expand to the full list on click', async () => {
    const user = userEvent.setup();
    const component = renderTable([installed]);

    // Compact: a "3 models" summary, not three badges up front.
    const summary = component.getByText('3 models');
    expect(component.queryByText('gpt-5.2')).not.toBeInTheDocument();

    await user.click(summary);

    expect(component.getByText('gpt-5.2')).toBeInTheDocument();
    expect(component.getByText('sonnet')).toBeInTheDocument();
  });
});
