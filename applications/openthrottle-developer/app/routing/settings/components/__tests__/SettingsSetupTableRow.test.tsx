import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub } from 'react-router';
import {
  Table,
  TableBody,
  TooltipProvider,
} from '@openthrottle/react-router-shadcn';
import { describe, expect, test, vi } from 'vitest';
import { SettingsSetupTableRow } from '../SettingsSetupTableRow';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

vi.mock('~/services/graphql-ws-client', () => ({
  getGraphqlWsClient: () => null,
}));

const notInstalled: AgentCliStatus = {
  backend: 'grok',
  enabled: true,
  installUrl: 'https://x.ai/cli/install.sh',
  installed: false,
  label: 'Grok',
  modelOptions: [],
  models: [],
  version: null,
};

const installed: AgentCliStatus = {
  backend: 'cursor',
  enabled: true,
  installUrl: 'https://cursor.com/install',
  installed: true,
  label: 'Cursor Agent',
  modelOptions: [
    { enabled: true, favorite: false, model: 'auto' },
    { enabled: false, favorite: true, model: 'gpt-5.2' },
  ],
  models: ['auto', 'gpt-5.2'],
  version: '2026.06.15',
};

const disabledAgent: AgentCliStatus = {
  ...installed,
  backend: 'claude',
  enabled: false,
  label: 'Claude Code',
};

const renderRow = (status: AgentCliStatus) => {
  const Component = () => (
    <TooltipProvider>
      <Table>
        <TableBody>
          <SettingsSetupTableRow
            canManage={true}
            installEnabled={true}
            status={status}
          />
        </TableBody>
      </Table>
    </TooltipProvider>
  );
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { action: () => ({ ok: true }), path: '/resources/agent-setup' },
    { action: () => ({ ok: true }), path: '/resources/agent-enabled' },
    { action: () => ({ ok: true }), path: '/resources/agent-model-enabled' },
    { action: () => ({ ok: true }), path: '/resources/agent-model-favorite' },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsSetupTableRow', () => {
  test('shows the label, backend code, and a Not installed badge for an absent CLI', () => {
    const component = renderRow(notInstalled);
    expect(component.getByText('Grok')).toBeInTheDocument();
    expect(component.getByText('grok')).toBeInTheDocument();
    expect(component.getByText('Not installed')).toBeInTheDocument();
    // No models to expand when not installed.
    expect(component.getByText('—')).toBeInTheDocument();
  });

  test('renders an install/update control and an enable toggle', () => {
    const component = renderRow(notInstalled);
    expect(
      component.getByTestId('SettingsSetupAgentToggle-grok'),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Install' }),
    ).toBeInTheDocument();
  });

  test('summarizes the enabled count and reveals per-model controls on expand', async () => {
    const user = userEvent.setup();
    const component = renderRow(installed);

    // "2 models" + "(1 of 2 enabled)" — one model is disabled.
    expect(component.getByText('2 models')).toBeInTheDocument();
    expect(component.getByText('(1 of 2 enabled)')).toBeInTheDocument();

    // Collapsed by default: no per-model rows yet.
    expect(
      component.queryByTestId('SettingsSetupModelRow-cursor-auto'),
    ).not.toBeInTheDocument();

    await user.click(
      component.getByTestId('SettingsSetupTableRow-cursor-expand'),
    );

    expect(
      component.getByTestId('SettingsSetupModelRow-cursor-auto'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsSetupModelToggle-cursor-gpt-5.2'),
    ).toBeInTheDocument();
    expect(
      component.getByTestId('SettingsSetupModelFavorite-cursor-gpt-5.2'),
    ).toBeInTheDocument();
  });

  test('disables per-model enable toggles when the agent itself is disabled', async () => {
    const user = userEvent.setup();
    const component = renderRow(disabledAgent);

    await user.click(
      component.getByTestId('SettingsSetupTableRow-claude-expand'),
    );

    expect(
      component.getByTestId('SettingsSetupModelToggle-claude-auto'),
    ).toBeDisabled();
  });
});
