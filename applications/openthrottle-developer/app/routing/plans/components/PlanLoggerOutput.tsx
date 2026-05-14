import * as React from 'react';
import { Card, Markdown } from '@openthrottle/react-router-shadcn';
import type { PlanDetailIndexLoaderQuery } from '~/__generated__/graphql';

type Chunk = PlanDetailIndexLoaderQuery['planOutputStreamChunks'][number];

export interface PlanLoggerOutputProps {
  readonly chunks: readonly Chunk[];
}

export const PlanLoggerOutput = (props: PlanLoggerOutputProps) => {
  const { chunks } = props;

  if (chunks.length === 0) {
    return (
      <Card
        className="text-muted-foreground p-4 md:p-8 w-full"
        data-testid="PlanLoggerOutput"
      >
        <p className="text-sm">
          No plan output chunks yet. Iterations append here when agents call{' '}
          <code className="text-xs">appendPlanOutput</code> (for example from
          workflow-ralph or MCP). Local CLI runs log to your terminal instead.
        </p>
      </Card>
    );
  }

  const markdown = chunks
    .map((chunk) => {
      const iter =
        chunk.iteration != null
          ? `iteration ${chunk.iteration}`
          : 'iteration ?';
      const when =
        typeof chunk.createdAt === 'string'
          ? chunk.createdAt
          : String(chunk.createdAt);

      return `### ${when} (${iter})\n\n${chunk.content}`;
    })
    .join('\n\n---\n\n');

  return (
    <Card
      className="p-4 md:p-8 w-full overflow-scroll"
      data-testid="PlanLoggerOutput"
    >
      <Markdown className="text-xs text-muted-foreground" content={markdown} />
    </Card>
  );
};
