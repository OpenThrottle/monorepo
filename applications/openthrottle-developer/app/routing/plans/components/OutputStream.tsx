/**
 * @description Renders plan/task output-stream chunks as a dense log: one
 * compact `HH:mm:ss` + iteration header per chunk, laid out in a time column
 * beside the content so a one-line message occupies one line. The calendar day
 * is hoisted into a separator that repeats only when the day changes, and the
 * full timestamp lives in the header's `title`/`dateTime` rather than on screen.
 * Each chunk compiles through its own {@link MarkdownRenderer} so one malformed
 * fragment cannot blank the whole stream.
 */
import * as React from 'react';
import { MarkdownRenderer } from '@openthrottle/react-router-markdown';
import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';
import {
  formatChunkTime,
  formatChunkTimestamp,
  groupChunksByDay,
  toChunkDateTimeAttribute,
} from '~/routing/plans/utils/output-stream-chunks';
import type { OutputStreamChunk } from '~/routing/plans/utils/output-stream-chunks';

export interface OutputStreamProps {
  chunks: readonly OutputStreamChunk[];
}

export const OutputStream = (props: OutputStreamProps): React.ReactElement => {
  const { chunks } = props;

  // Hooks

  // Setup
  const groups = React.useMemo(() => groupChunksByDay(chunks), [chunks]);

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
          <p className="text-muted-foreground/80 mb-4 text-sm">
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
                    {time === null ? null : (
                      <time
                        dateTime={dateTime ?? undefined}
                        title={timestamp ?? undefined}
                      >
                        {time}
                      </time>
                    )}
                    {chunk.iteration == null ? null : (
                      <span title={OUTPUT_STREAM_COPY.iterationTitle}>
                        {`${OUTPUT_STREAM_COPY.iterationPrefix}${chunk.iteration}`}
                      </span>
                    )}
                  </span>

                  <MarkdownRenderer
                    className="text-muted-foreground min-w-0 text-xs"
                    source={chunk.content}
                  />
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};
