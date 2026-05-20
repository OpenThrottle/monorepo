import * as React from 'react';
import classnames from 'classnames';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { GaugeIcon } from 'lucide-react';

interface DashboardIntroductionProps {
  readonly className?: string;
}

export const DashboardIntroduction = (props: DashboardIntroductionProps) => {
  const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames('', className)}
      data-testid="DashboardIntroduction"
    >
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={GaugeIcon}
        title="Dashboard"
      />
      <p className="text-sm text-muted-foreground">
        Get a pulse of all your Plans, Tasks, PR's, Prompts, Skills, and more
        coming soon.
      </p>
    </div>
  );
};
