import * as React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { SettingsKeysForm } from '../SettingsKeysForm';
import type { SettingsKeysFormProps } from '../SettingsKeysForm';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';

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

const renderForm = (props: SettingsKeysFormProps = {}): RenderResult => {
  const Component = () => <SettingsKeysForm {...props} />;
  const RoutesStub = createRoutesStub([
    { Component, path: '/' },
    {
      action: async () => ({ ok: true }),
      path: '/settings/keys',
    },
  ]);
  return render(<RoutesStub initialEntries={['/']} />);
};

describe('SettingsKeysForm Component', () => {
  afterEach(() => {
    cleanup();
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  describe('when dialog is closed', () => {
    test('does not show create form in the document', () => {
      renderForm({ createDialogOpen: false, serviceAccountId: 'sa-1' });

      expect(
        screen.queryByRole('heading', { name: 'Create credential' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when dialog is open', () => {
    test('renders create credential form with intent fields', () => {
      renderForm({
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      expect(screen.getByTestId('SettingsKeysForm')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: 'Create credential' }),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('SettingsKeysForm-label-input'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('SettingsKeysForm-submit-button'),
      ).toBeEnabled();
      const intentInput = document.querySelector(
        'input[name="intent"]',
      ) as HTMLInputElement | null;
      expect(intentInput?.value).toBe('createCredential');
      const accountInput = document.querySelector(
        'input[name="serviceAccountId"]',
      ) as HTMLInputElement | null;
      expect(accountInput?.value).toBe('sa-1');
    });

    test('disables submit when no service account is selected', () => {
      renderForm({
        createDialogOpen: true,
        serviceAccountId: null,
      });

      expect(
        screen.getByTestId('SettingsKeysForm-submit-button'),
      ).toBeDisabled();
    });
  });

  describe('when create succeeds', () => {
    test('shows one-time token and copy control', () => {
      renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      expect(
        screen.getByRole('heading', { name: 'Credential created' }),
      ).toBeInTheDocument();
      expect(screen.getByTestId('SettingsKeysForm-token-input')).toHaveValue(
        'ot_sa_abcd_secret',
      );
      expect(
        screen.getByTestId('SettingsKeysForm-copy-token'),
      ).toBeInTheDocument();
      expect(
        screen.queryByTestId('SettingsKeysForm-submit-button'),
      ).not.toBeInTheDocument();
    });

    test('shows error toast when copy fails', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('denied')),
        },
      });

      renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      await user.click(screen.getByTestId('SettingsKeysForm-copy-token'));

      expect(toastError).toHaveBeenCalledWith(
        'Could not copy token to clipboard',
      );
    });

    test('copies token and shows success toast', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      await user.click(screen.getByTestId('SettingsKeysForm-copy-token'));

      expect(writeText).toHaveBeenCalledWith('ot_sa_abcd_secret');
      expect(toastSuccess).toHaveBeenCalledWith(
        'Credential token copied to clipboard',
      );
    });
  });
});
