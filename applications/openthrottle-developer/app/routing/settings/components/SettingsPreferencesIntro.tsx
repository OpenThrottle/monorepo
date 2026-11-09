import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { SlidersHorizontalIcon } from 'lucide-react';
import * as React from 'react';

import { SETTINGS_PREFERENCES_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsPreferencesIntroProps {
  readonly className?: string;
}

export const SettingsPreferencesIntro = (
  props: SettingsPreferencesIntroProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={cn(className)} data-testid="SettingsPreferencesIntro">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={SlidersHorizontalIcon}
        title={SETTINGS_PREFERENCES_COPY.title}
      />
      <p className="text-muted-foreground max-w-prose text-sm">
        {SETTINGS_PREFERENCES_COPY.intro}
      </p>
    </div>
  );
};
