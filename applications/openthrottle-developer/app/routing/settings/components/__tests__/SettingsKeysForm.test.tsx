import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { afterEach, describe, expect, test, vi } from 'vitest';

import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';

import type { SettingsKeysFormProps } from '../SettingsKeysForm';
import { SettingsKeysForm } from '../SettingsKeysForm';

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
): ServiceAccountCredentialFieldsFragment => {
  return {
    __typename: 'ServiceAccountCredentialObject',
    createdAt: '2026-01-01T00:00:00.000Z',
    expiresAt: null,
    label: 'CI deploy',
    lastUsedAt: null,
    revokedAt: null,
    serviceAccountId: 'sa-1',
    ...overrides,
  };
};

const renderForm = (props: SettingsKeysFormProps = {}): RenderResult => {
  const Component = () => {
    return <SettingsKeysForm {...props} />;
  };
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
    toastError.mockClear();
    toastSuccess.mockClear();
  });

  describe('when dialog is closed', () => {
    test('does not show create form in the document', () => {
      const component = renderForm({
        createDialogOpen: false,
        serviceAccountId: 'sa-1',
      });

      expect(
        component.queryByRole('heading', { name: 'Create credential' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('when dialog is open', () => {
    test('renders create credential form with intent fields', () => {
      const component = renderForm({
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      expect(component.getByTestId('SettingsKeysForm')).toBeInTheDocument();
      expect(
        component.getByRole('heading', { name: 'Create credential' }),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysForm-label-input'),
      ).toBeInTheDocument();
      expect(
        component.getByTestId('SettingsKeysForm-submit-button'),
      ).toBeEnabled();
      const intentInput = document.querySelector<HTMLInputElement>(
        'input[name="intent"]',
      );
      expect(intentInput?.value).toBe('createCredential');
      const accountInput = document.querySelector<HTMLInputElement>(
        'input[name="serviceAccountId"]',
      );
      expect(accountInput?.value).toBe('sa-1');
    });

    test('disables submit when no service account is selected', () => {
      const component = renderForm({
        createDialogOpen: true,
        serviceAccountId: null,
      });

      expect(
        component.getByTestId('SettingsKeysForm-submit-button'),
      ).toBeDisabled();
    });
  });

  describe('when create succeeds', () => {
    test('shows one-time token and copy control', () => {
      const component = renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      expect(
        component.getByRole('heading', { name: 'Credential created' }),
      ).toBeInTheDocument();
      expect(component.getByTestId('SettingsKeysForm-token-input')).toHaveValue(
        'ot_sa_abcd_secret',
      );
      expect(
        component.getByTestId('SettingsKeysForm-copy-token'),
      ).toBeInTheDocument();
      expect(
        component.queryByTestId('SettingsKeysForm-submit-button'),
      ).not.toBeInTheDocument();
    });

    test('shows error toast when copy fails', async () => {
      const user = userEvent.setup();
      vi.stubGlobal('navigator', {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error('denied')),
        },
      });

      const component = renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      await user.click(component.getByTestId('SettingsKeysForm-copy-token'));

      expect(toastError).toHaveBeenCalledWith(
        'Could not copy token to clipboard',
      );
    });

    test('copies token and shows success toast', async () => {
      const user = userEvent.setup();
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { clipboard: { writeText } });

      const component = renderForm({
        actionData: {
          credential: credential({ id: 'cred-1', prefix: 'abcd1234' }),
          intent: 'createCredential',
          token: 'ot_sa_abcd_secret',
        },
        createDialogOpen: true,
        serviceAccountId: 'sa-1',
      });

      await user.click(component.getByTestId('SettingsKeysForm-copy-token'));

      expect(writeText).toHaveBeenCalledWith('ot_sa_abcd_secret');
      expect(toastSuccess).toHaveBeenCalledWith(
        'Credential token copied to clipboard',
      );
    });
  });
});
