import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AgentSetupActionResult } from '~/routes/resources.agent-setup';
import type { AgentCliStatus } from '~/routing/settings/data/data.agent-clis';
import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';
import type { UseAgentSetupStreamResult } from '~/routing/settings/hooks/useAgentSetupStream';

import { SettingsAgentsCliControls } from '../SettingsAgentsCliControls';

// Drive the run's stream directly: the real hook opens a graphql-ws
// subscription, which is out of scope for the row's behavior.
const { streamState } = vi.hoisted(() => {
  const initial: UseAgentSetupStreamResult = {
    chunks: [],
    done: false,
    error: null,
  };
  return { streamState: { current: initial } };
});

vi.mock('~/routing/settings/hooks/useAgentSetupStream', () => ({
  useAgentSetupStream: (runId: string | null): UseAgentSetupStreamResult => {
    if (runId == null) {
      return { chunks: [], done: false, error: null };
    }
    return streamState.current;
  },
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

const startedRun: AgentSetupActionResult = {
  backend: 'claude',
  disabled: false,
  errorMessage: null,
  mode: 'update',
  runId: 'run-1',
};

const chunk = (
  data: string,
  overrides: Partial<UseAgentSetupStreamResult['chunks'][number]> = {},
): UseAgentSetupStreamResult['chunks'][number] => {
  return {
    data,
    done: false,
    error: null,
    exitCode: null,
    id: `chunk-${data}`,
    runId: 'run-1',
    sortOrder: 0,
    stream: 'stdout',
    ...overrides,
  };
};

const renderControls = (
  props: React.ComponentProps<typeof SettingsAgentsCliControls>,
  actionResult: AgentSetupActionResult | { ok: boolean } = { ok: true },
) => {
  const Component = () => {
    return <SettingsAgentsCliControls {...props} />;
  };
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    { action: () => actionResult, path: '/resources/agent-setup' },
  ]);
  return render(<RoutesStub />);
};

const startRun = async (actionResult: AgentSetupActionResult = startedRun) => {
  const user = userEvent.setup();
  const component = renderControls(
    { canManage: true, installEnabled: true, status: installed },
    actionResult,
  );
  await user.click(component.getByRole('button', { name: 'Update' }));
  await component.findByTestId('SettingsAgentsSetupLogDialog');
  return { component, user };
};

describe('SettingsAgentsCliControls', () => {
  beforeEach(() => {
    streamState.current = { chunks: [], done: false, error: null };
  });

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
    // No run yet: no status line, no View log, no dialog.
    expect(
      component.queryByRole('button', {
        name: SETTINGS_AGENTS_COPY.setupLogViewButton,
      }),
    ).not.toBeInTheDocument();
    expect(
      component.queryByTestId('SettingsAgentsCliControlsStatus'),
    ).not.toBeInTheDocument();
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

  describe('running', () => {
    test('auto-opens the log dialog titled for the agent, with a sanitized log and no inline pre', async () => {
      streamState.current = {
        chunks: [chunk('\u001b[34m==>\u001b[39m Upgrading opencode\n')],
        done: false,
        error: null,
      };
      const { component } = await startRun();

      expect(
        component.getByRole('heading', { name: 'Updating Claude Code' }),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogLog'),
      ).toHaveTextContent('==> Upgrading opencode');
      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogLog').textContent,
      ).not.toContain('\u001b');
      expect(
        component.queryByTestId('SettingsAgentsCliControlsLog'),
      ).not.toBeInTheDocument();
    });

    test('closing the dialog leaves a compact status and View log reopens it', async () => {
      streamState.current = {
        chunks: [chunk('==> Fetching opencode\n')],
        done: false,
        error: null,
      };
      const { component, user } = await startRun();

      await user.keyboard('{Escape}');
      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialog'),
      ).not.toBeInTheDocument();

      const statusLine = component.getByTestId(
        'SettingsAgentsCliControlsStatus',
      );
      expect(statusLine).toHaveAttribute('data-status', 'running');
      expect(statusLine).toHaveTextContent('==> Fetching opencode');
      // The run is not cancelled by closing: the button is still in flight.
      expect(
        component.getByRole('button', { name: /Updating…/ }),
      ).toBeDisabled();

      await user.click(
        component.getByRole('button', {
          name: SETTINGS_AGENTS_COPY.setupLogViewButton,
        }),
      );
      expect(
        await component.findByTestId('SettingsAgentsSetupLogDialog'),
      ).toBeInTheDocument();
    });
  });

  describe('succeeded', () => {
    test('the row summarizes the last log line', async () => {
      streamState.current = {
        chunks: [
          chunk('==> Upgrading opencode\nAlready up to date.\n', {
            id: 'a',
          }),
          chunk('', { done: true, exitCode: 0, id: 'b', sortOrder: 1 }),
        ],
        done: true,
        error: null,
      };
      const { component } = await startRun();

      const statusLine = component.getByTestId(
        'SettingsAgentsCliControlsStatus',
      );
      expect(statusLine).toHaveAttribute('data-status', 'succeeded');
      expect(statusLine).toHaveTextContent('Already up to date.');
      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogStatus'),
      ).toHaveAttribute('data-status', 'succeeded');
    });
  });

  describe('failed', () => {
    test('the row and the dialog show the failure with its exit code', async () => {
      streamState.current = {
        chunks: [
          chunk('boom\n', { id: 'a' }),
          chunk('', {
            done: true,
            error: 'non-zero-exit',
            exitCode: 1,
            id: 'b',
            sortOrder: 1,
          }),
        ],
        done: true,
        error: 'non-zero-exit',
      };
      const { component } = await startRun();

      const statusLine = component.getByTestId(
        'SettingsAgentsCliControlsStatus',
      );
      expect(statusLine).toHaveAttribute('data-status', 'failed');
      expect(statusLine).toHaveTextContent('exit code 1');
      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogStatus'),
      ).toHaveAttribute('data-status', 'failed');
    });
  });

  describe('start rejected', () => {
    test('a start error with no run renders inline and opens no dialog', async () => {
      const user = userEvent.setup();
      const component = renderControls(
        { canManage: true, installEnabled: true, status: installed },
        { ...startedRun, errorMessage: 'Unknown backend', runId: null },
      );
      await user.click(component.getByRole('button', { name: 'Update' }));

      expect(await component.findByText('Unknown backend')).toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialog'),
      ).not.toBeInTheDocument();
    });
  });
});
