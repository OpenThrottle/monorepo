import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardHeader,
  Markdown,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, ChevronUp, TerminalSquareIcon } from 'lucide-react';

// const stripAnsi = (str: string): string => str.replace(/\x1b\[[0-9;]*m/g, '');

export interface PlanLoggerOutputProps {
  readonly className?: string;
  readonly logs: any[];
}

export const PlanLoggerOutput = (props: PlanLoggerOutputProps) => {
  const { className, logs } = props;

  console.log('---> logs', typeof logs);

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
      data-testid="PlanLoggerOutput"
    >
      <CardHeader className="flex flex-row w-full gap-4">
        <div className="min-w-0 space-y-1.5 flex-1">
          <div className="flex items-center gap-4">
            <TerminalSquareIcon className="size-6" />
            <h2 className="text-lg flex-1 font-semibold leading-none tracking-tight">
              Workflow Output
            </h2>
            <Button
              aria-controls="workflow-run-options"
              aria-expanded={true}
              aria-label="Toggle workflow output"
              className="shrink-0 size-8"
              onClick={onToggleExpanded}
              variant="ghost"
            >
              <Icon aria-hidden={true} className="size-4" />
            </Button>
          </div>

          {isExpanded ? (
            <Markdown
              className="text-xs text-muted-foreground"
              content={logs
                .map((log) => {
                  return `${log.timestamp}: \n\n${log.data}`;
                })
                .join('\n')}
            />
          ) : null}
        </div>
      </CardHeader>
    </Card>
  );
};
