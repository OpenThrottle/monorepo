import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';
import { SettingsKeysCredentialStatusBadge } from './SettingsKeysCredentialStatusBadge';
import type { SettingsKeysCredentialStatusBadgeProps } from './SettingsKeysCredentialStatusBadge';
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
  prefix: 'sk_live_abcd',
  revokedAt: null,
  serviceAccountId: 'sa-1',
  ...overrides,
});

describe('SettingsKeysCredentialStatusBadge Component', () => {
  let component: RenderResult;
  let props: SettingsKeysCredentialStatusBadgeProps;

  beforeEach(() => {
    props = { credential: credential() };
    component = render(<SettingsKeysCredentialStatusBadge {...props} />);
  });

  test('renders an Active badge for a credential with no expiry or revocation', () => {
    expect(
      component.getByTestId(`SettingsKeysTable-status-${props.credential.id}`),
    ).toHaveTextContent('Active');
  });

  test('renders a Revoked badge when revokedAt is set', () => {
    component.unmount();
    component = render(
      <SettingsKeysCredentialStatusBadge
        credential={credential({ revokedAt: '2026-02-01T00:00:00.000Z' })}
      />,
    );

    expect(
      component.getByTestId(`SettingsKeysTable-status-${props.credential.id}`),
    ).toHaveTextContent('Revoked');
  });

  test('renders an Expired badge when expiresAt is in the past', () => {
    component.unmount();
    component = render(
      <SettingsKeysCredentialStatusBadge
        credential={credential({ expiresAt: '2020-01-01T00:00:00.000Z' })}
      />,
    );

    expect(
      component.getByTestId(`SettingsKeysTable-status-${props.credential.id}`),
    ).toHaveTextContent('Expired');
  });
});
