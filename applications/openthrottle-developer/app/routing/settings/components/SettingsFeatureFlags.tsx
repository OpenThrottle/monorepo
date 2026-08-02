import * as React from 'react';
import * as FEATURE_FLAGS from '@openthrottle/react-router-utils/src/config/features';
import { FlagIcon } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

export interface SettingsFeatureFlagsProps {
  className?: string;
}

export const SettingsFeatureFlags = (
  _props: SettingsFeatureFlagsProps,
): React.ReactElement => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={FlagIcon}
      id="feature-flags"
      legend="Feature flags"
    >
      <div>
        <div className="text-muted-foreground space-y-2 text-sm">
          {Object.entries(FEATURE_FLAGS).map(([key, value]) => (
            <p className="gap-2" key={key}>
              <span className="font-medium">{key}:</span>
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {value ? 'true' : 'false'}
              </code>
            </p>
          ))}

          <p>
            <span className="font-medium">REACT_ROUTER_DEV_TOOLS</span> is read
            when the Vite dev server starts. Set{' '}
            <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
              REACT_ROUTER_DEV_TOOLS=true
            </code>{' '}
            in <code className="text-xs">.env</code> and restart{' '}
            <code className="text-xs">nx run openthrottle-developer:dev</code>.
            See the monorepo doc below.
          </p>
        </div>
      </div>
    </OpenThrottleFieldset>
  );
};
