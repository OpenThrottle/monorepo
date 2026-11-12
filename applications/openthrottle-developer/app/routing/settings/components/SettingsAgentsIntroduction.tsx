import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { HatGlassesIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsAgentsIntroductionProps {
  /** ISO-8601 timestamp of the discovery scan, shown as "last checked". */
  scannedAt?: string | null;
}

export const SettingsAgentsIntroduction = (
  props: SettingsAgentsIntroductionProps,
): React.ReactElement => {
  const { scannedAt } = props;

  // Hooks

  // Setup
  const hasScannedAt = scannedAt != null && scannedAt !== '';

  // Handlers

  // Markup
  const lastChecked = (
    <p className="text-muted-foreground mt-1 text-xs">
      Last checked {new Date(scannedAt ?? '').toLocaleString()}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div data-testid="SettingsAgentsIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={HatGlassesIcon}
        title="Agents"
      />
      <p className="text-muted-foreground text-sm">
        Agent CLIs detected on the server host. Each shows whether it is
        installed and, when available, its version and the models it can run.{' '}
        <Link
          className="underline underline-offset-4"
          data-testid="SettingsAgentsIntroduction-default-link"
          to="/settings/preferences"
        >
          {SETTINGS_PREFERENCES_COPY.setDefaultAgentLink}
        </Link>
      </p>

      {hasScannedAt ? lastChecked : null}
    </div>
  );
};
