/**
 * @description Task detail Output tab body. Mirrors {@link PlanTabOutput} but
 * renders only the current task's output chunks (task-scoped) through the
 * shared {@link OutputStream}, with a "View full plan output"
 * affordance pointing at the plan Output tab. Shows an empty state when the task
 * has no attributed chunks yet.
 */
import * as React from 'react';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { Link } from 'react-router';
import type { TaskOutputStreamChunksQuery } from '@openthrottle/openthrottle-developer-codegen';
import { OutputStream } from '~/routing/plans/components/OutputStream';

type Chunk = TaskOutputStreamChunksQuery['planOutputStreamChunks'][number];

export interface TaskTabOutputProps {
  chunks: Chunk[];
  /** Plan the task belongs to; used for the "View full plan output" link target. */
  planId: string;
}

export const TaskTabOutput = (
  props: TaskTabOutputProps,
): React.ReactElement => {
  const { chunks, planId } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <TabsContent
      className="w-full space-y-4 overflow-scroll rounded-lg"
      data-testid="TaskLoggerOutput"
      value="output"
    >
      <div className="flex justify-end">
        <Link
          className="text-muted-foreground hover:text-foreground text-xs underline-offset-4 hover:underline"
          prefetch="intent"
          to={`/plans/${planId}?tab=output`}
        >
          View full plan output
        </Link>
      </div>

      {chunks.length === 0 ? (
        <OpenThrottleEmptyState
          description="This task has no output yet. Iterations that tag this task with its id will appear here."
          title="No task output yet"
        />
      ) : (
        <OutputStream chunks={chunks} />
      )}
    </TabsContent>
  );
};
