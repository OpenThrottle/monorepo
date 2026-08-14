import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import { ArrowRightIcon, CircleCheckBigIcon, CircleIcon } from 'lucide-react';
import clsx from 'clsx';

export interface DashboardGetStartedStepProps {
  className?: string;
  complete: boolean;
  cta: string;
  description: string;
  href: string;
  title: string;
}

/**
 * @description One row of the dashboard "Get Started" checklist: a completion
 * indicator (filled check when done, empty circle otherwise), the step title +
 * description, and a deep-link CTA that is hidden once the step is complete.
 * Completion is derived from real state upstream — this component just renders it.
 */
export const DashboardGetStartedStep = (
  props: DashboardGetStartedStepProps,
): React.ReactElement => {
  const { className, complete, cta, description, href, title } = props;

  // Hooks

  // Setup
  const StatusIcon = complete ? CircleCheckBigIcon : CircleIcon;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <li
      className={clsx('flex items-center gap-3 py-3', className)}
      data-complete={complete}
      data-testid="DashboardGetStartedStep"
    >
      <StatusIcon
        aria-hidden={true}
        className={clsx(
          'h-5 w-5 shrink-0',
          complete ? 'text-primary' : 'text-muted-foreground',
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={clsx(
            'text-sm font-medium',
            complete && 'text-muted-foreground line-through',
          )}
        >
          {title}
        </p>
        <p className="text-muted-foreground text-xs">{description}</p>
      </div>
      {complete ? null : (
        <Button asChild={true} className="shrink-0" size="xs" variant="outline">
          <Link to={href} viewTransition={true}>
            {cta} <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </li>
  );
};
