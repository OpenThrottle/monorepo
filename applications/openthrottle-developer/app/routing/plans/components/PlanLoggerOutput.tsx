import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardHeader,
  Markdown,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { mockOutput } from '~/routing/plans/data/mock.output';

export interface PlanLoggerOutputProps {
  readonly className?: string;
}

export const PlanLoggerOutput = (props: PlanLoggerOutputProps) => {
  const { className } = props;

  // Hooks
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Setup
  const Icon = isExpanded ? ChevronUp : ChevronDown;

  // Handlers
  const onToggleExpanded = () => {
    setIsExpanded((previous) => !previous);
  };

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
          <div className="flex items-center gap-2 justify-between">
            <h2 className="text-lg font-semibold leading-none tracking-tight">
              Workflow Output
            </h2>
            <Button
              aria-controls="workflow-run-options"
              aria-expanded={true}
              aria-label="Hide workflow run options"
              className="shrink-0 size-8"
              onClick={onToggleExpanded}
              variant="ghost"
            >
              <Icon aria-hidden={true} className="size-4" />
            </Button>
          </div>

          {isExpanded ? (
            <Markdown
              className="overflow-x-auto text-xs text-muted-foreground"
              content={mockOutput}
            />
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
};
