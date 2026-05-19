import * as React from 'react';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { ListChevronsUpDownIcon } from 'lucide-react';

interface PlansIntroductionProps {
  readonly className?: string;
}

export const PlansIntroduction = (_props: PlansIntroductionProps) => {
  // const { className } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <GlobalHeading
        className="mb-4"
        heading="h1"
        icon={ListChevronsUpDownIcon}
        title="Plans"
      />
      <p className="text-muted-foreground text-sm">
        Plans are OpenThrottle&apos;s record of intended work—what you decided
        to build, broken into tasks with status, assignee, and optional
        summaries. Browse and filter here, open a plan for tasks and iteration
        output, queue a run for agentic execution (Ralph), and follow linked
        commits that tie shipped work on main back to each plan.
      </p>
    </div>
  );
};
