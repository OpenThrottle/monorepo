import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';

import type { ServiceAccountListItemFragment } from '~/__generated__/graphql';

import type { SettingsKeysToolbarProps } from '../SettingsKeysToolbar';
import { SettingsKeysToolbar } from '../SettingsKeysToolbar';

const account = (
  overrides: Partial<ServiceAccountListItemFragment> &
    Pick<ServiceAccountListItemFragment, 'id' | 'name'>,
): ServiceAccountListItemFragment => {
  return {
    createdAt: '2026-01-01T00:00:00.000Z',
    description: null,
    disabledAt: null,
    ...overrides,
  };
};

const renderToolbar = (props: SettingsKeysToolbarProps = {}): RenderResult => {
  const Component = () => {
    return <SettingsKeysToolbar {...props} />;
  };
  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
  return render(<RoutesStub />);
};

describe('SettingsKeysToolbar Component', () => {
  describe('when no service accounts', () => {
    test('shows empty message and disables create', () => {
      const component = renderToolbar({ serviceAccounts: [] });

      expect(component.getByTestId('SettingsKeysToolbar')).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysToolbar-no-accounts'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeDisabled();
    });
  });

  describe('when create is not allowed', () => {
    test('disables create button even when accounts exist', () => {
      const component = renderToolbar({
        canCreate: false,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [account({ id: 'sa-1', name: 'openthrottle-mcp' })],
      });

      expect(
        component.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeDisabled();
    });
  });

  describe('when one service account', () => {
    test('shows account name without select and enables create', () => {
      const component = renderToolbar({
        canCreate: true,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [account({ id: 'sa-1', name: 'openthrottle-mcp' })],
      });

      expect(component.getByText(/openthrottle-mcp/)).toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsKeysToolbar-account-select'),
      ).not.toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysToolbar-create-button'),
      ).toBeEnabled();
    });
  });

  describe('when multiple service accounts', () => {
    const onServiceAccountChange = vi.fn();
    const onCreateDialogOpenChange = vi.fn();

    test('renders account select', () => {
      const component = renderToolbar({
        canCreate: true,
        onCreateDialogOpenChange,
        onServiceAccountChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'openthrottle-mcp' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      expect(
        component.getByTestId('SettingsKeysToolbar-account-select'),
      ).toBeInTheDocument();
    });

    test('calls onServiceAccountChange when account changes', async () => {
      onServiceAccountChange.mockClear();
      const component = renderToolbar({
        canCreate: true,
        onServiceAccountChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'openthrottle-mcp' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('SettingsKeysToolbar-account-select'),
      );
      await user.click(
        component.getByRole('option', { name: 'workflow-ralph' }),
      );

      expect(onServiceAccountChange).toHaveBeenCalledWith('sa-2');
    });

    test('opens create dialog via onCreateDialogOpenChange', async () => {
      onCreateDialogOpenChange.mockClear();
      const component = renderToolbar({
        canCreate: true,
        onCreateDialogOpenChange,
        selectedServiceAccountId: 'sa-1',
        serviceAccounts: [
          account({ id: 'sa-1', name: 'openthrottle-mcp' }),
          account({ id: 'sa-2', name: 'workflow-ralph' }),
        ],
      });

      const user = userEvent.setup();
      await user.click(
        component.getByTestId('SettingsKeysToolbar-create-button'),
      );

      expect(onCreateDialogOpenChange).toHaveBeenCalledWith(true);
    });
  });
});
