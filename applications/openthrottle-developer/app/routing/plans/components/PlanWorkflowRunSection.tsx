import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

export interface PlanWorkflowRunSectionProps {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly heading: string;
}

/**
 * @description One labelled section of the plan "Runs" card (Upcoming, Latest run, Run history):
 * a small, uppercase, muted `h3` that also names the `<section>` for assistive tech.
 */
export const PlanWorkflowRunSection = (
  props: PlanWorkflowRunSectionProps,
): React.ReactElement => {
  const { children, className, heading } = props;

  // Hooks
  const headingId = React.useId();

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <section
      aria-labelledby={headingId}
      className={cn('flex flex-col gap-3', className)}
    >
      <h3
        className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        id={headingId}
      >
        {heading}
      </h3>
      {children}
    </section>
  );
};
