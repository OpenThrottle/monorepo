import * as React from 'react';
import clsx from 'clsx';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { GaugeIcon } from 'lucide-react';

export interface DashboardIntroductionProps {
  className?: string;
}

export const DashboardIntroduction = (
  props: DashboardIntroductionProps,
): React.ReactElement => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className={clsx('', className)} data-testid="DashboardIntroduction">
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={GaugeIcon}
        title="Dashboard"
      />
      <p className="text-muted-foreground text-sm">
        Get a pulse of all your Plans, Tasks, PR's, Prompts, Skills, and more
        coming soon.
      </p>
    </div>
  );
};
