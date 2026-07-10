import { formatDate } from 'date-fns';
import type { BadgeProps } from '@openthrottle/react-router-shadcn';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';

export type SettingsKeysCredentialStatus = 'active' | 'expired' | 'revoked';

export const SETTINGS_KEYS_TABLE_DATE_FORMAT = 'MMM d, yyyy';

export const credentialStatusLabels: Record<
  SettingsKeysCredentialStatus,
  string
> = {
  active: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
};

export const credentialStatusBadgeColor: Record<
  SettingsKeysCredentialStatus,
  BadgeProps['color']
> = {
  active: 'green',
  expired: 'amber',
  revoked: 'slate',
};

/**
 * @description Derives credential lifecycle status for table badges and revoke eligibility.
 */
export const getSettingsKeysCredentialStatus = (
  credential: Pick<
    ServiceAccountCredentialFieldsFragment,
    'expiresAt' | 'revokedAt'
  >,
): SettingsKeysCredentialStatus => {
  if (credential.revokedAt != null) {
    return 'revoked';
  }
  if (credential.expiresAt != null) {
    const expires = new Date(credential.expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) {
      return 'expired';
    }
  }
  return 'active';
};

export const formatCredentialTimestamp = (value: unknown): string => {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number' &&
    !(value instanceof Date)
  ) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return formatDate(date, SETTINGS_KEYS_TABLE_DATE_FORMAT);
};

export const credentialRowId = (
  credential: ServiceAccountCredentialFieldsFragment,
): string => credential.id;

export const credentialDisplayName = (
  credential: ServiceAccountCredentialFieldsFragment,
): string => credential.label?.trim() || credential.prefix;
