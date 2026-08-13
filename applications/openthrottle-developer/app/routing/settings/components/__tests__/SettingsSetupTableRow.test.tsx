import * as React from 'react';
import { render } from '@testing-library/react';
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
  models: [],
  version: null,
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
});
