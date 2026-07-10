import * as React from 'react';
import { KeyRoundIcon } from 'lucide-react';
import {
  Empty,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';

export interface SettingsKeysTableEmptyProps {}

export const SettingsKeysTableEmpty = (
  _props: SettingsKeysTableEmptyProps,
): React.ReactElement => {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Empty data-testid="SettingsKeysTable-empty">
      <EmptyMedia variant="icon">
        <KeyRoundIcon className="size-6" />
      </EmptyMedia>
      <EmptyTitle>No credentials yet</EmptyTitle>
      <EmptyDescription>
        Create a credential to get a one-time bearer token for MCP, Ralph
        workers, or CI. Existing secrets are never shown again after creation.
      </EmptyDescription>
    </Empty>
  );
};
