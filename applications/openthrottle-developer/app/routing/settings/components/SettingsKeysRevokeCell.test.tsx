import * as React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysRevokeCell } from './SettingsKeysRevokeCell';
import type { SettingsKeysRevokeCellProps } from './SettingsKeysRevokeCell';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';

const credential = (
  overrides: Partial<ServiceAccountCredentialFieldsFragment> = {},
): ServiceAccountCredentialFieldsFragment => ({
  __typename: 'ServiceAccountCredentialObject',
  createdAt: '2026-01-01T00:00:00.000Z',
  expiresAt: null,
  id: 'cred-1',
  label: 'CI deploy',
  lastUsedAt: null,
  prefix: 'ot_sa_abc',
  revokedAt: null,
  serviceAccountId: 'sa-1',
  ...overrides,
});

describe('SettingsKeysRevokeCell Component', () => {
  let component: RenderResult;
  let props: SettingsKeysRevokeCellProps;

  beforeEach(() => {
    props = { canRevoke: true, credential: credential() };
  });

  const renderCell = (
    action: () => Promise<unknown> = async () => ({ ok: true }),
  ): RenderResult => {
    const Component = () => <SettingsKeysRevokeCell {...props} />;
    const RoutesStub = createRoutesStub([
      { Component, path: '/' },
      { action, path: '/settings/keys' },
    ]);
    return render(<RoutesStub initialEntries={['/']} />);
  };

  test('renders an em dash when the credential is not active', () => {
    props = {
      ...props,
      credential: credential({ revokedAt: '2026-02-01T00:00:00.000Z' }),
    };
    component = renderCell();

    expect(component.getByText('—')).toBeInTheDocument();
  });

  test('renders a Revoke trigger for an active credential', () => {
    component = renderCell();

    expect(
      component.getByTestId('SettingsKeysTable-revoke-trigger-cred-1'),
    ).toBeInTheDocument();
  });

  test('disables the trigger when canRevoke is false', () => {
    props = { ...props, canRevoke: false };
    component = renderCell();

    expect(
      component.getByTestId('SettingsKeysTable-revoke-trigger-cred-1'),
    ).toBeDisabled();
  });

  test('opens the confirmation dialog with the credential display name', async () => {
    component = renderCell();

    await userEvent.click(
      component.getByTestId('SettingsKeysTable-revoke-trigger-cred-1'),
    );

    expect(component.getByText('Revoke credential?')).toBeInTheDocument();
    expect(component.getByText(/CI deploy/)).toBeInTheDocument();
  });

  test('submits the revoke form with the credential id', async () => {
    component = renderCell();

    await userEvent.click(
      component.getByTestId('SettingsKeysTable-revoke-trigger-cred-1'),
    );

    const submit = component.getByTestId(
      'SettingsKeysTable-revoke-submit-cred-1',
    );
    await userEvent.click(submit);

    expect(
      component.getByTestId('SettingsKeysTable-revoke-trigger-cred-1'),
    ).toBeInTheDocument();
  });
});
