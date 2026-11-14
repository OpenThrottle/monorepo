import { ChartAreaIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import { UsagePageIntroduction } from './UsagePageIntroduction';

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
    <UsagePageIntroduction
      className={className}
      icon={ChartAreaIcon}
      title="Usage"
    >
      Usage metrics for this portal over the last {rangeDays} days. Agent token,
      skill and telemetry detail live on{' '}
      <Link className="underline" to="/usage/agents">
        Agents
      </Link>
      ,{' '}
      <Link className="underline" to="/usage/skills">
        Skills
      </Link>{' '}
      and{' '}
      <Link className="underline" to="/usage/telemetry">
        Telemetry
      </Link>
      .
    </UsagePageIntroduction>
  );
};
