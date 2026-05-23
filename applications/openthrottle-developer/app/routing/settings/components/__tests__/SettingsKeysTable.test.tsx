import * as React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test } from 'vitest';
import {
  getSettingsKeysCredentialStatus,
  SettingsKeysTable,
} from '../SettingsKeysTable';
import type { SettingsKeysTableProps } from '../SettingsKeysTable';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';

const credential = (
  overrides: Partial<ServiceAccountCredentialFieldsFragment> &
    Pick<ServiceAccountCredentialFieldsFragment, 'id' | 'prefix'>,
): ServiceAccountCredentialFieldsFragment => ({
  __typename: 'ServiceAccountCredentialObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: null,
  label: 'CI deploy',
  lastUsedAt: null,
  revokedAt: null,
  serviceAccountId: 'sa-1',
  ...overrides,
});

const renderTable = (props: SettingsKeysTableProps = {}): RenderResult => {
  const Component = () => <SettingsKeysTable {...props} />;
  const RoutesStub = createRoutesStub([
    {
      Component,
      path: '/',
    },
    {
      action: async () => ({ ok: true }),
      path: '/settings/keys',
    },
  ]);
  return render(<RoutesStub initialEntries={['/']} />);
};

describe('getSettingsKeysCredentialStatus', () => {
  test('returns revoked when revokedAt is set', () => {
    expect(
      getSettingsKeysCredentialStatus({
        expiresAt: null,
        revokedAt: '2026-02-01T00:00:00.000Z',
      }),
    ).toBe('revoked');
  });

  test('returns expired when expiresAt is in the past', () => {
    expect(
      getSettingsKeysCredentialStatus({
        expiresAt: '2020-01-01T00:00:00.000Z',
        revokedAt: null,
      }),
    ).toBe('expired');
  });

  test('returns active otherwise', () => {
    expect(
      getSettingsKeysCredentialStatus({
        expiresAt: '2099-01-01T00:00:00.000Z',
        revokedAt: null,
      }),
    ).toBe('active');
  });
});

describe('SettingsKeysTable Component', () => {
  afterEach(() => {
    cleanup();
  });

  test('should render empty state', () => {
    const component = renderTable();
    expect(
      component.getByTestId('SettingsKeysTable-empty'),
    ).toBeInTheDocument();
    expect(component.baseElement).toMatchSnapshot();
  });

  describe('when credentials are empty', () => {
    test('shows action error when provided', () => {
      renderTable({ actionError: 'Failed to revoke credential.' });

      expect(
        screen.getByTestId('SettingsKeysTable-action-error'),
      ).toHaveTextContent('Failed to revoke credential.');
    });
  });

  describe('when credentials exist', () => {
    const activeCredential = credential({
      id: 'cred-active',
      prefix: 'ot_sa_abc',
    });
    const revokedCredential = credential({
      id: 'cred-revoked',
      label: null,
      prefix: 'ot_sa_old',
      revokedAt: '2026-02-01T00:00:00.000Z',
    });
    const expiredCredential = credential({
      expiresAt: '2020-01-01T00:00:00.000Z',
      id: 'cred-expired',
      label: 'Expired key',
      prefix: 'ot_sa_exp',
    });

    test('renders rows and status badges', () => {
      renderTable({
        credentials: [activeCredential, revokedCredential, expiredCredential],
      });

      expect(screen.getByText('CI deploy')).toBeInTheDocument();
      expect(screen.getByText('Expired key')).toBeInTheDocument();
      expect(screen.getAllByText('ot_sa_abc').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByTestId('SettingsKeysTable-status-cred-active'),
      ).toHaveTextContent('Active');
      expect(
        screen.getByTestId('SettingsKeysTable-status-cred-revoked'),
      ).toHaveTextContent('Revoked');
      expect(
        screen.getByTestId('SettingsKeysTable-status-cred-expired'),
      ).toHaveTextContent('Expired');
    });

    describe('revoke flow', () => {
      test('active row shows revoke dialog with correct intent fields', async () => {
        renderTable({
          canRevoke: true,
          credentials: [activeCredential],
        });

        const user = userEvent.setup();
        await user.click(
          screen.getByTestId('SettingsKeysTable-revoke-trigger-cred-active'),
        );

        const dialog = screen.getByRole('alertdialog');
        expect(
          within(dialog).getByText(/Revoke credential\?/),
        ).toBeInTheDocument();

        const intentInput =
          within(dialog).getByDisplayValue('revokeCredential');
        expect(intentInput).toHaveAttribute('name', 'intent');
        expect(within(dialog).getByDisplayValue('cred-active')).toHaveAttribute(
          'name',
          'credentialId',
        );
      });

      test('revoked row has no revoke trigger', () => {
        renderTable({
          canRevoke: true,
          credentials: [revokedCredential],
        });

        expect(
          screen.queryByTestId('SettingsKeysTable-revoke-trigger-cred-revoked'),
        ).not.toBeInTheDocument();
      });

      test('disables revoke when canRevoke is false', () => {
        renderTable({
          canRevoke: false,
          credentials: [activeCredential],
        });

        expect(
          screen.getByTestId('SettingsKeysTable-revoke-trigger-cred-active'),
        ).toBeDisabled();
      });
    });
  });
});
