import * as React from 'react';
import { PlanDetailIndexLoaderQuery } from '@openthrottle/openthrottle-developer-codegen';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { EditorWindow } from '@openthrottle/react-router-editor';

type Chunk = PlanDetailIndexLoaderQuery['planOutputStreamChunks'][number];

export interface PlanTabOutputProps {
  chunks: Chunk[];
  className?: string;
}

export const PlanTabOutput = (props: PlanTabOutputProps) => {
  const { chunks, className: _className } = props;

  // Hooks

  // Setup
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (chunks.length === 0) {
    return (
      <TabsContent
        className="text-muted-foreground p-4 md:p-8 w-full"
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
      <EditorWindow className="h-96" language="markdown" value={markdown} />
      {/* <Markdown className="text-xs text-muted-foreground" content={markdown} /> */}
    </TabsContent>
  );
};
