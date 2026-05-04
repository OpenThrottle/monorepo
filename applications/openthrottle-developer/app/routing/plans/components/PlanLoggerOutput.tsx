import * as React from 'react';
import { Card, Markdown } from '@openthrottle/react-router-shadcn';

export interface PlanLoggerOutputProps {
  readonly logs: any[];
}

export const PlanLoggerOutput = (props: PlanLoggerOutputProps) => {
  const { logs } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="p-4 md:p-8 w-full overflow-scroll">
      <Markdown
        className="text-xs text-muted-foreground"
        content={logs
          .map((log) => {
            return `${log.timestamp}: \n\n${log.data}`;
          })
          .join('\n')}
      />
    </Card>
  );
};
