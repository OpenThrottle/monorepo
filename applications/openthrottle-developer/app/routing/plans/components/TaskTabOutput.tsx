import * as React from 'react';
import { TabsContent } from '@openthrottle/react-router-shadcn';
import { OpenThrottleEmptyState } from '@openthrottle/react-router-ui';
import { OutputStream } from '~/routing/plans/components/OutputStream';
import type { TaskOutputStreamChunksQuery } from '@openthrottle/openthrottle-developer-codegen';

type Chunk = TaskOutputStreamChunksQuery['planOutputStreamChunks'][number];

export interface TaskTabOutputProps {
  chunks: Chunk[];
}

/**
 * @description Task detail Output tab body. Mirrors {@link PlanTabOutput} but
 * renders only the current task's output chunks (task-scoped) through the
 * shared {@link OutputStream}, with a "View full plan output"
 * affordance pointing at the plan Output tab. Shows an empty state when the task
 * has no attributed chunks yet.
 */
export const TaskTabOutput = (
  props: TaskTabOutputProps,
): React.ReactElement => {
  const { chunks } = props;

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
