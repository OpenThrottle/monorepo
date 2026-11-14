import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ChartAreaIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

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
        Usage metrics for this portal over the last {rangeDays} days. Skill,
        agent token and telemetry detail live on{' '}
        <Link className="underline" to="/usage/skills">
          Skills
        </Link>
        ,{' '}
        <Link className="underline" to="/usage/agents">
          Agents
        </Link>{' '}
        and{' '}
        <Link className="underline" to="/usage/telemetry">
          Telemetry
        </Link>
        .
      </p>
    </div>
  );
};
