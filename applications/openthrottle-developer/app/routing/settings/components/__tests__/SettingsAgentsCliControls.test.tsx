import { act, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AgentSetupActionResult } from '~/routes/resources.agent-setup';
import type { AgentCliStatus } from '~/routing/settings/data/agent-clis';
import type { UseAgentSetupStreamResult } from '~/routing/settings/hooks/useAgentSetupStream';

import { SettingsAgentsCliControls } from '../SettingsAgentsCliControls';

// Drive the run's stream directly: the real hook opens a graphql-ws
// subscription, which is out of scope for the row's behavior. Subscribers let
// a test advance a live run (e.g. running → failed) without remounting.
const { streamState } = vi.hoisted(() => {
  const initial: UseAgentSetupStreamResult = {
    chunks: [],
    done: false,
    error: null,
  };
  return {
    streamState: {
      current: initial,
      listeners: new Set<() => void>(),
    },
  };
});

vi.mock('~/routing/settings/hooks/useAgentSetupStream', async () => {
  const ReactModule = await import('react');
  const idle: UseAgentSetupStreamResult = {
    chunks: [],
    done: false,
    error: null,
  };
  const subscribe = (listener: () => void): (() => void) => {
    streamState.listeners.add(listener);
    return () => {
      streamState.listeners.delete(listener);
    };
  };
  const getSnapshot = (): UseAgentSetupStreamResult => {
    return streamState.current;
  };
  return {
    useAgentSetupStream: (runId: string | null): UseAgentSetupStreamResult => {
      const current = ReactModule.useSyncExternalStore(subscribe, getSnapshot);
      return runId == null ? idle : current;
    },
  };
});

const setStream = (next: UseAgentSetupStreamResult): void => {
  act(() => {
    streamState.current = next;
    for (const listener of streamState.listeners) {
      listener();
    }
  });
};

const failedStream: UseAgentSetupStreamResult = {
  chunks: [],
  done: true,
  error: 'non-zero-exit',
};

const notInstalled: AgentCliStatus = {
  driver: 'grok',
  enabled: true,
  installUrl: 'https://x.ai/cli/install.sh',
  installed: false,
  label: 'Grok',
  modelOptions: [],
  models: [],
  version: null,
};

const installed: AgentCliStatus = {
  driver: 'claude',
  enabled: true,
  installUrl: 'https://claude.ai/install.sh',
  installed: true,
  label: 'Claude Code',
  modelOptions: [{ enabled: true, favorite: false, model: 'opus' }],
  models: ['opus'],
  version: '2.1.0',
};

const startedRun: AgentSetupActionResult = {
  disabled: false,
  driver: 'claude',
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
  actionResult: AgentSetupActionResult | Promise<never> | { ok: boolean } = {
    ok: true,
  },
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
    // No run yet: just the button, no spinner, no dialog.
    expect(component.queryByRole('status')).not.toBeInTheDocument();
    expect(
      component.queryByTestId('SettingsAgentsSetupLogDialog'),
    ).not.toBeInTheDocument();
  });

  describe('submitting', () => {
    test('the button is disabled with a spinner before the run starts', async () => {
      const user = userEvent.setup();
      // An action that never settles holds the fetcher in `submitting`.
      const component = renderControls(
        { canManage: true, installEnabled: true, status: installed },
        new Promise<never>(() => {}),
      );

      await user.click(component.getByRole('button', { name: 'Update' }));

      const button = await component.findByRole('button', {
        name: /Updating…/,
      });
      expect(button).toBeDisabled();
      expect(within(button).getByRole('status')).toBeInTheDocument();
    });
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

    test('closing the dialog leaves only the in-flight spinner button', async () => {
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

      // No inline output: neither the log line nor a View log button.
      expect(
        component.queryByTestId('SettingsAgentsCliControlsStatus'),
      ).not.toBeInTheDocument();
      expect(
        component.queryByText(/Fetching opencode/),
      ).not.toBeInTheDocument();
      expect(component.getAllByRole('button')).toHaveLength(1);
      // The run is not cancelled by closing: the button is still in flight.
      const button = component.getByRole('button', { name: /Updating…/ });
      expect(button).toBeDisabled();
      expect(within(button).getByRole('status')).toBeInTheDocument();
    });
  });

  describe('succeeded', () => {
    test('the dialog reports success and the row shows no summary', async () => {
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

      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogStatus'),
      ).toHaveAttribute('data-status', 'succeeded');
      expect(
        component.queryByTestId('SettingsAgentsCliControlsStatus'),
      ).not.toBeInTheDocument();
      // Done: the button is actionable again. The open modal hides the row
      // from the accessibility tree, hence `hidden`.
      expect(
        component.getByRole('button', { hidden: true, name: 'Update' }),
      ).toBeEnabled();
    });
  });

  describe('failed', () => {
    test('the dialog shows the failure with its exit code', async () => {
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

      const dialogStatus = component.getByTestId(
        'SettingsAgentsSetupLogDialogStatus',
      );
      expect(dialogStatus).toHaveAttribute('data-status', 'failed');
      expect(dialogStatus).toHaveTextContent('exit code 1');
      expect(
        component.queryByTestId('SettingsAgentsCliControlsStatus'),
      ).not.toBeInTheDocument();
    });

    test('a run that fails after the dialog was closed reopens it', async () => {
      const { component, user } = await startRun();

      await user.keyboard('{Escape}');
      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialog'),
      ).not.toBeInTheDocument();

      setStream(failedStream);

      const dialog = await component.findByTestId(
        'SettingsAgentsSetupLogDialog',
      );
      expect(
        within(dialog).getByTestId('SettingsAgentsSetupLogDialogStatus'),
      ).toHaveAttribute('data-status', 'failed');
    });

    test('closing the reopened failure keeps it closed', async () => {
      const { component, user } = await startRun();

      await user.keyboard('{Escape}');
      setStream(failedStream);
      await component.findByTestId('SettingsAgentsSetupLogDialog');

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(
          component.queryByTestId('SettingsAgentsSetupLogDialog'),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('start rejected', () => {
    test('a start error with no run renders inline and opens no dialog', async () => {
      const user = userEvent.setup();
      const component = renderControls(
        { canManage: true, installEnabled: true, status: installed },
        { ...startedRun, errorMessage: 'Unknown driver', runId: null },
      );
      await user.click(component.getByRole('button', { name: 'Update' }));

      expect(await component.findByText('Unknown driver')).toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialog'),
      ).not.toBeInTheDocument();
    });
  });
});
