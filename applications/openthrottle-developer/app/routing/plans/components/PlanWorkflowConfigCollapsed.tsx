import * as React from 'react';
import classnames from 'classnames';
import { Button, Card, CardHeader } from '@openthrottle/react-router-shadcn';
import { ChevronDown } from 'lucide-react';

export interface PlanWorkflowConfigCollapsedProps {
  readonly className?: string;
  readonly onClick: () => void;
}

export const PlanWorkflowConfigCollapsed = (
  props: PlanWorkflowConfigCollapsedProps,
) => {
  const { className, onClick } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={classnames('mb-6', className)}
      data-testid="workflow-run-options-collapsed"
    >
      <CardHeader className="flex flex-row w-full gap-4">
        <div className="min-w-0 space-y-1.5 flex-1">
          <h2 className="text-lg font-semibold leading-none tracking-tight">
            Workflow Configuration
          </h2>
          <p className="text-muted-foreground text-sm">
            Tuning for <code className="text-xs">pnpm exec workflow-ralph</code>{' '}
            and for queued runs from the toolbar. Defaults apply while
            collapsed; expand to change iterations, model, prompt, and more.
          </p>
        </div>

        <Button
          aria-controls="workflow-run-options"
          aria-expanded={false}
          className="shrink-0 size-8"
          data-testid="workflow-run-options-expand"
          onClick={onClick}
          variant="ghost"
        >
          <ChevronDown aria-hidden={true} className="size-4" />
        </Button>
      </CardHeader>
    </Card>
  );
};
