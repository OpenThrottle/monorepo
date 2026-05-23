import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SettingsKeysToolbar } from '../SettingsKeysToolbar';
import type { SettingsKeysToolbarProps } from '../SettingsKeysToolbar';
import type { ServiceAccountListItemFragment } from '~/__generated__/graphql';

const account = (
  overrides: Partial<ServiceAccountListItemFragment> &
    Pick<ServiceAccountListItemFragment, 'id' | 'name'>,
): ServiceAccountListItemFragment => ({
  __typename: 'ServiceAccountObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: null,
  disabledAt: null,
  ...overrides,
});

const renderToolbar = (props: SettingsKeysToolbarProps = {}): RenderResult => {
  const Component = () => <SettingsKeysToolbar {...props} />;
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SettingsKeysToolbar Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('should render', () => {
    const component = renderToolbar();
    expect(component.baseElement).toMatchSnapshot();
  });

  describe('when no service accounts', () => {
    test('shows empty message and disables create', () => {
      renderToolbar({ serviceAccounts: [] });

      expect(
        screen.getByTestId('SettingsKeysToolbar-no-accounts'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeDisabled();
    });
  });

  describe('when create is not allowed', () => {
    test('disables create button even when accounts exist', () => {
      renderToolbar({
        canCreate: false,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [account({ id: 'sa-1', name: 'mcp-developer' })],
      });

      expect(
        screen.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeDisabled();
    });
  });

  describe('when one service account', () => {
    test('shows account name without select and enables create', () => {
      renderToolbar({
        canCreate: true,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [account({ id: 'sa-1', name: 'mcp-developer' })],
      });

      expect(screen.getByText(/mcp-developer/)).toBeInTheDocument();
      expect(
        screen.queryByTestId('SettingsKeysToolbar-account-select'),
      ).not.toBeInTheDocument();
      expect(
        screen.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeEnabled();
    });
  });

  describe('when multiple service accounts', () => {
    const onServiceAccountChange = vi.fn();
    const onCreateDialogOpenChange = vi.fn();

    test('renders account select', () => {
      renderToolbar({
        canCreate: true,
        onCreateDialogOpenChange,
        onServiceAccountChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'mcp-developer' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      expect(
        screen.getByTestId('SettingsKeysToolbar-account-select'),
      ).toBeInTheDocument();
    });

    test('calls onServiceAccountChange when account changes', async () => {
      onServiceAccountChange.mockClear();
      renderToolbar({
        canCreate: true,
        onServiceAccountChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'mcp-developer' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      const user = userEvent.setup();
      await user.click(
        screen.getByTestId('SettingsKeysToolbar-account-select'),
      );
      await user.click(screen.getByRole('option', { name: 'workflow-ralph' }));

      expect(onServiceAccountChange).toHaveBeenCalledWith('sa-2');
    });

    test('opens create dialog via onCreateDialogOpenChange', async () => {
      onCreateDialogOpenChange.mockClear();
      renderToolbar({
        canCreate: true,
        onCreateDialogOpenChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'mcp-developer' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('SettingsKeysToolbar-create-button'));

      expect(onCreateDialogOpenChange).toHaveBeenCalledWith(true);
    });
  });
});
