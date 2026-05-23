import * as React from 'react';
import classnames from 'classnames';
import { MonitorCogIcon } from 'lucide-react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';

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
    <div className={classnames(className)}>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={MonitorCogIcon}
        title="Workspace"
      />
      <p className="text-muted-foreground text-sm">
        Configure your workspace settings to make OpenThrottle work for you.
      </p>
    </div>
  );
};
