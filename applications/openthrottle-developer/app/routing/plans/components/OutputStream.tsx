/**
 * @description Renders plan/task output-stream chunks as a dense log: one
 * compact `HH:mm:ss` + iteration header per chunk, laid out in a time column
 * beside the content so a one-line message occupies one line. The calendar day
 * is hoisted into a separator that repeats only when the day changes, and the
 * full timestamp lives in the header's `title`/`dateTime` rather than on screen.
 * Each chunk compiles through its own {@link MarkdownRenderer} so one malformed
 * fragment cannot blank the whole stream. Task-tagged chunks (worker and validation output)
 * are raw CLI text, so they render verbatim in a monospace `<pre>` instead of as Markdown, with
 * the task named where its output starts.
 */
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import * as React from 'react';

import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';
import type { OutputStreamChunk } from '~/routing/plans/utils/output-stream-chunks';
import {
  formatChunkTime,
  formatChunkTimestamp,
  getTaskDisplayName,
  getTaskRunStartIds,
  groupChunksByDay,
  toChunkDateTimeAttribute,
} from '~/routing/plans/utils/output-stream-chunks';

export interface OutputStreamProps {
  chunks: readonly OutputStreamChunk[];

  /** @description Task titles by id, for labeling task-tagged chunks; an unknown id shows its short form. */
  taskTitles?: ReadonlyMap<string, string>;
}

export const OutputStream = (props: OutputStreamProps): React.ReactElement => {
  const { chunks, taskTitles } = props;

  // Hooks

  // Setup
  const groups = React.useMemo(() => groupChunksByDay(chunks), [chunks]);
  const taskRunStarts = React.useMemo(
    () => getTaskRunStartIds(chunks),
    [chunks],
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-3" data-testid="OutputStream">
      {groups.map((group) => (
        <section
          key={`${group.label ?? OUTPUT_STREAM_COPY.unknownDay}-${group.chunks[0]?.id}`}
        >
          <p className="text-foreground/80 mb-8 text-sm">
            {group.label ?? OUTPUT_STREAM_COPY.unknownDay}
          </p>

          <ol className="border-border/60 mt-1 space-y-1.5 border-l pl-3">
            {group.chunks.map((chunk) => {
              const time = formatChunkTime(chunk.createdAt);
              const timestamp = formatChunkTimestamp(chunk.createdAt);
              const dateTime = toChunkDateTimeAttribute(chunk.createdAt);

              return (
                <li
                  className="grid grid-cols-[auto_1fr] items-baseline gap-x-3"
                  key={chunk.id}
                >
                  <span className="text-muted-foreground/80 flex items-baseline gap-1.5 font-mono text-[11px] whitespace-nowrap tabular-nums">
                    {time !== null && (
                      <time
                        dateTime={dateTime ?? undefined}
                        title={timestamp ?? undefined}
                      >
                        {time}
                      </time>
                    )}
                    {chunk.iteration != null && (
                      <span title={OUTPUT_STREAM_COPY.iterationTitle}>
                        {`${OUTPUT_STREAM_COPY.iterationPrefix}${chunk.iteration}`}
                      </span>
                    )}
                  </span>

                  {chunk.taskId == null && (
                    <MarkdownRenderer
                      className="text-muted-foreground min-w-0 text-xs"
                      source={chunk.content}
                    />
                  )}
                  {chunk.taskId != null && (
                    <div className="min-w-0">
                      {taskRunStarts.has(chunk.id) && (
                        <p
                          className="text-foreground/80 mb-0.5 text-[11px] font-medium"
                          data-testid="OutputStream-task"
                          title={OUTPUT_STREAM_COPY.taskTitle}
                        >
                          {OUTPUT_STREAM_COPY.taskLabel(
                            getTaskDisplayName(chunk.taskId, taskTitles),
                          )}
                        </p>
                      )}
                      <pre className="text-muted-foreground font-mono text-xs break-words whitespace-pre-wrap">
                        {chunk.content}
                      </pre>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};
