import { cn } from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { GaugeIcon } from 'lucide-react';
import * as React from 'react';

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
    <div className={cn('', className)} data-testid="DashboardIntroduction">
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
