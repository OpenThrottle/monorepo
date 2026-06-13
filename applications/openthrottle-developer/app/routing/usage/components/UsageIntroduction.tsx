import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ChartAreaIcon } from 'lucide-react';

export interface UsageIntroductionProps {
  className?: string;
  rangeDays: number;
}

export const UsageIntroduction = (
  props: UsageIntroductionProps,
): React.ReactElement => {
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
      <p className="text-muted-foreground text-sm">
        Usage metrics for this portal over the last {rangeDays} days.
      </p>
    </div>
  );
};
