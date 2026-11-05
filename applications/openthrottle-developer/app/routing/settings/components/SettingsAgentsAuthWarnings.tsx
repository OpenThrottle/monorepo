import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import type { AgentCliAuthWarning } from '~/routing/settings/data/data.agent-clis';
import { settingsAgentsAuthWarningTitle } from '~/routing/settings/utils/settings-agents-copy';

export interface SettingsAgentsAuthWarningsProps {
  /** Per-agent credential warnings from discovery (`claude auth status`); empty renders nothing. */
  warnings: readonly AgentCliAuthWarning[];
}

/**
 * Prominent alerts for agents whose active credential needs attention, chiefly an `ANTHROPIC_API_KEY`
 * that overrides the Claude subscription (runs would bill the API key).
 */
export const SettingsAgentsAuthWarnings = (
  props: SettingsAgentsAuthWarningsProps,
): React.ReactElement | null => {
  const { warnings } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (warnings.length === 0) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-2"
      data-testid="SettingsAgentsAuthWarnings"
    >
      {warnings.map((entry) => (
        <Alert
          data-testid={`SettingsAgentsAuthWarning-${entry.backend}`}
          key={entry.backend}
          variant="destructive"
        >
          <AlertTitle>{settingsAgentsAuthWarningTitle(entry.label)}</AlertTitle>
          <AlertDescription>{entry.warning}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
};
