import * as React from 'react';
import { render } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { SettingsAgentsCliControls } from '../SettingsAgentsCliControls';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis.data';

// The stream hook opens a graphql-ws subscription; with no browser client it is
// inert, but stub the singleton so the component never reaches for a real socket.
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
  backend: 'claude',
  enabled: true,
  installUrl: 'https://claude.ai/install.sh',
  installed: true,
  label: 'Claude Code',
  modelOptions: [{ enabled: true, favorite: false, model: 'opus' }],
  models: ['opus'],
  version: '2.1.0',
};

const renderControls = (
  props: React.ComponentProps<typeof SettingsAgentsCliControls>,
) => {
  const Component = () => <SettingsAgentsCliControls {...props} />;
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { action: () => ({ ok: true }), path: '/resources/agent-setup' },
  ]);
  return render(<RoutesStub />);
};

describe('SettingsAgentsCliControls', () => {
  test('install-available: enabled Install button for an absent CLI', () => {
    const component = renderControls({
      canManage: true,
      installEnabled: true,
      status: notInstalled,
    });
    const button = component.getByRole('button', { name: 'Install' });
    expect(button).toBeEnabled();
  });

  test('update-available: enabled Update button for an installed CLI', () => {
    const component = renderControls({
      canManage: true,
      installEnabled: true,
      status: installed,
    });
    const button = component.getByRole('button', { name: 'Update' });
    expect(button).toBeEnabled();
  });

  test('disabled-by-flag: button disabled, but the env explanation is NOT repeated here', () => {
    const component = renderControls({
      canManage: true,
      installEnabled: false,
      status: notInstalled,
    });
    expect(component.getByRole('button', { name: 'Install' })).toBeDisabled();
    // The OT_AGENT_CLI_INSTALL_ENABLED explanation now lives once at the route
    // level (SettingsAgentsInstallNotice), never inside the per-row controls.
    expect(
      component.queryByText(/OT_AGENT_CLI_INSTALL_ENABLED/),
    ).not.toBeInTheDocument();
  });

  test('no-permission: button disabled with a settings:write explanation', () => {
    const component = renderControls({
      canManage: false,
      installEnabled: true,
      status: installed,
    });
    expect(component.getByRole('button', { name: 'Update' })).toBeDisabled();
    expect(component.getByText(/settings:write/)).toBeInTheDocument();
  });
});
