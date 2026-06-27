import * as React from 'react';
import { PlanDetailIndexLoaderQuery } from '@openthrottle/openthrottle-developer-codegen';
import { Card, TabsContent } from '@openthrottle/react-router-shadcn';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';

type Chunk = PlanDetailIndexLoaderQuery['planOutputStreamChunks'][number];

export interface PlanTabOutputProps {
  chunks: Chunk[];
  className?: string;
}

export const PlanTabOutput = (
  props: PlanTabOutputProps,
): React.ReactElement => {
  const { chunks, className: _className } = props;

  // Hooks
  const markdown = React.useMemo(
    () =>
      chunks
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
        .join('\n\n---\n\n'),
    [chunks],
  );

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (chunks.length === 0) {
    return (
      <TabsContent
        className="bg-card border-card-border text-muted-foreground w-full rounded-lg border p-4 md:p-8"
        data-testid="PlanLoggerOutput"
        value="output"
      >
        <p className="text-sm">
          No plan output chunks yet. Iterations append here when agents call{' '}
          <code className="text-xs">appendPlanOutput</code> (for example from
          workflow-ralph or MCP). Local CLI runs log to your terminal instead.
        </p>
      </TabsContent>
    );
  }

  return (
    <TabsContent
      className="w-full overflow-scroll rounded-lg"
      data-testid="PlanLoggerOutput"
      value="output"
    >
      <Card className="p-4 md:p-8">
        <MarkdownRenderer
          className="text-muted-foreground text-xs"
          source={markdown}
        />
      </Card>
    </TabsContent>
  );
};
