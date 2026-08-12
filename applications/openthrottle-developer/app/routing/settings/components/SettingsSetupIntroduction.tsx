import * as React from 'react';
import { TerminalIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

export interface SettingsSetupIntroductionProps {
  /** ISO-8601 timestamp of the discovery scan, shown as "last checked". */
  scannedAt?: string | null;
}

export const SettingsSetupIntroduction = (
  props: SettingsSetupIntroductionProps,
): React.ReactElement => {
  const { scannedAt } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="SettingsSetupIntroduction">
      <GlobalHeading
        className="mb-2"
        heading="h1"
        icon={TerminalIcon}
        title="Agent CLI setup"
      />
      <p className="text-muted-foreground text-sm">
        Agent CLIs detected on the server host. Each shows whether it is
        installed and, when available, its version and the models it can run.
      </p>
      {scannedAt != null && scannedAt !== '' ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Last checked {new Date(scannedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
};
