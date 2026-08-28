import * as React from 'react';
import clsx from 'clsx';
import { MonitorCogIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsWorkspaceIntroProps {
  className?: string;
}

export const SettingsWorkspaceIntro = (
  props: SettingsWorkspaceIntroProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx(className)}>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={MonitorCogIcon}
        title={WORKSPACE_SETTINGS_COPY.title}
      />
      <p className="text-muted-foreground max-w-prose text-sm">
        {WORKSPACE_SETTINGS_COPY.intro}
      </p>
    </div>
  );
};
