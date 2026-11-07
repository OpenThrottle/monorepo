import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SETTINGS_AGENTS_COPY } from '~/routing/settings/data/data.copy';

import { SettingsAgentsSetupLogDialog } from '../SettingsAgentsSetupLogDialog';

const { toastError, toastSuccess } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: toastError,
    success: toastSuccess,
  }),
}));

type DialogProps = React.ComponentProps<typeof SettingsAgentsSetupLogDialog>;

const renderDialog = (overrides: Partial<DialogProps> = {}) => {
  const props: DialogProps = {
    agentName: 'OpenCode',
    logText: '==> Upgrading opencode\n┌ done',
    mode: 'update',
    onOpenChange: vi.fn(),
    open: true,
    status: { kind: 'running' },
    ...overrides,
  };
  return {
    component: render(<SettingsAgentsSetupLogDialog {...props} />),
    props,
  };
};

describe('SettingsAgentsSetupLogDialog', () => {
  beforeEach(() => {
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  describe('running', () => {
    test('titles the run and shows a spinner with the running label', () => {
      const { component } = renderDialog();

      expect(
        component.getByRole('heading', { name: 'Updating OpenCode' }),
      ).toBeInTheDocument();
      const status = component.getByTestId(
        'SettingsAgentsSetupLogDialogStatus',
      );
      expect(status).toHaveAttribute('data-status', 'running');
      expect(status).toHaveTextContent(SETTINGS_AGENTS_COPY.setupLogRunning);
      expect(component.getByRole('status')).toBeInTheDocument();
    });

    test('renders the log text, box-drawing characters included', () => {
      const { component } = renderDialog();

      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogLog'),
      ).toHaveTextContent('┌ done');
    });

    test('install mode titles the run as an install', () => {
      const { component } = renderDialog({
        agentName: 'Grok',
        mode: 'install',
      });

      expect(
        component.getByRole('heading', { name: 'Installing Grok' }),
      ).toBeInTheDocument();
    });
  });

  describe('empty', () => {
    test('shows the waiting state and disables copy before the first chunk', () => {
      const { component } = renderDialog({ logText: '' });

      expect(
        component.getByTestId('SettingsAgentsSetupLogDialogEmpty'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialogLog'),
      ).not.toBeInTheDocument();
      expect(
        component.getByRole('button', {
          name: SETTINGS_AGENTS_COPY.setupLogCopyButton,
        }),
      ).toBeDisabled();
    });
  });

  describe('succeeded', () => {
    test('shows the success label and no spinner', () => {
      const { component } = renderDialog({ status: { kind: 'succeeded' } });

      const status = component.getByTestId(
        'SettingsAgentsSetupLogDialogStatus',
      );
      expect(status).toHaveAttribute('data-status', 'succeeded');
      expect(status).toHaveTextContent(SETTINGS_AGENTS_COPY.setupLogSucceeded);
      expect(component.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('failed', () => {
    test('shows the exit code and error message', () => {
      const { component } = renderDialog({
        status: { error: 'brew exploded', exitCode: 1, kind: 'failed' },
      });

      const status = component.getByTestId(
        'SettingsAgentsSetupLogDialogStatus',
      );
      expect(status).toHaveAttribute('data-status', 'failed');
      expect(status).toHaveTextContent('Failed (exit code 1): brew exploded');
    });
  });

  describe('copy', () => {
    test('copies the log text to the clipboard and confirms', async () => {
      const user = userEvent.setup();
      const { component, props } = renderDialog();

      await user.click(
        component.getByRole('button', {
          name: SETTINGS_AGENTS_COPY.setupLogCopyButton,
        }),
      );

      await expect(navigator.clipboard.readText()).resolves.toBe(props.logText);
      expect(toastSuccess).toHaveBeenCalledWith(
        SETTINGS_AGENTS_COPY.setupLogCopiedToast,
      );
    });
  });

  describe('close', () => {
    test('the footer Close button requests close', async () => {
      const user = userEvent.setup();
      const { component, props } = renderDialog();

      const closeButtons = component.getAllByRole('button', {
        name: SETTINGS_AGENTS_COPY.setupLogCloseButton,
      });
      const footerClose = closeButtons.at(-1);
      if (footerClose == null) {
        throw new Error('expected a Close button');
      }
      await user.click(footerClose);

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });

    test('renders nothing while closed', () => {
      const { component } = renderDialog({ open: false });

      expect(
        component.queryByTestId('SettingsAgentsSetupLogDialog'),
      ).not.toBeInTheDocument();
    });
  });
});
