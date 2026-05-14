import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ChartAreaIcon } from 'lucide-react';

export interface UsageIntroductionProps {
  readonly className?: string;
  readonly rangeDays: number;
}

export const UsageIntroduction = (props: UsageIntroductionProps) => {
  const { className, rangeDays } = props;

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
        icon={ChartAreaIcon}
        title="Usage"
      />
      <p className="text-sm text-muted-foreground">
        Usage metrics for this portal over the last {rangeDays} days.
      </p>
    </div>
  );
};
