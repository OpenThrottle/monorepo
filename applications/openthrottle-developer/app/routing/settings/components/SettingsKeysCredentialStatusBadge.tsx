import * as React from 'react';
import { Badge } from '@openthrottle/react-router-shadcn';
import type { ServiceAccountCredentialFieldsFragment } from '~/__generated__/graphql';
import {
  credentialStatusBadgeColor,
  credentialStatusLabels,
  getSettingsKeysCredentialStatus,
} from '~/routing/settings/utils/settings-keys-credential';

export interface SettingsKeysCredentialStatusBadgeProps {
  credential: ServiceAccountCredentialFieldsFragment;
}

export const SettingsKeysCredentialStatusBadge = (
  props: SettingsKeysCredentialStatusBadgeProps,
): React.ReactElement => {
  const { credential } = props;

  // Hooks

  // Setup
  const status = getSettingsKeysCredentialStatus(credential);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Badge
      color={credentialStatusBadgeColor[status]}
      data-testid={`SettingsKeysTable-status-${credential.id}`}
      size="xs"
    >
      {credentialStatusLabels[status]}
    </Badge>
  );
};
