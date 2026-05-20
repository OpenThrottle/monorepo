import * as React from 'react';
import * as FEATURE_FLAGS from '@openthrottle/react-router-utils/src/config/features';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { FlagIcon } from 'lucide-react';
import { Card } from '@openthrottle/react-router-shadcn';

export interface SettingsFeatureFlagsProps {
  className?: string;
}

export const SettingsFeatureFlags = (props: SettingsFeatureFlagsProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={className}>
      <GlobalHeading
        className="mb-4"
        heading="h3"
        icon={FlagIcon}
        title="Feature flags"
      />

      <Card className="p-4 space-y-2 text-sm text-muted-foreground">
        {Object.entries(FEATURE_FLAGS).map(([key, value]) => (
          <p className="gap-2" key={key}>
            <span className="font-medium">{key}:</span>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {value ? 'true' : 'false'}
            </code>
          </p>
        ))}

        <p>
          <span className="font-medium">REACT_ROUTER_DEV_TOOLS</span> is read
          when the Vite dev server starts. Set{' '}
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
            REACT_ROUTER_DEV_TOOLS=true
          </code>{' '}
          in <code className="text-xs">.env</code> and restart{' '}
          <code className="text-xs">nx run openthrottle-developer:dev</code>.
          See the monorepo doc below.
        </p>
        <p>
          <span className="font-medium">APP_ENABLE_ANALYTICS</span> and{' '}
          <span className="font-medium">APP_ENABLE_AUTHENTICATION</span> are not
          included in <code className="text-xs">window.env</code>; check your
          environment or deployment config if you need them.
        </p>
      </Card>
    </div>
  );
};
