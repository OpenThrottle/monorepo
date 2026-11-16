import {
  cn,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { OUTPUT_STREAM_COPY } from '~/routing/plans/data/data.copy';
import type { OutputStreamAttemptGroup } from '~/routing/plans/utils/output-stream-attempts';
import {
  buildAttemptHeader,
  summarizeAttempt,
} from '~/routing/plans/utils/output-stream-attempts';

export interface OutputStreamAttemptProps {
  attempt: OutputStreamAttemptGroup;
}

const PRE_CLASS = `text-muted-foreground font-mono text-xs break-words whitespace-pre-wrap`;

export const OutputStreamAttempt = (
  props: OutputStreamAttemptProps,
): React.ReactElement => {
  const { attempt } = props;

  // Hooks
  const [isOpen, setIsOpen] = React.useState(false);

  // Setup
  const summary = summarizeAttempt(attempt);
  const header = buildAttemptHeader(attempt, summary);
  const toggleLabel = isOpen
    ? OUTPUT_STREAM_COPY.attemptDetailsHide
    : OUTPUT_STREAM_COPY.attemptDetailsShow;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className={cn('border-border/60 space-y-1 rounded-md border p-2')}
      data-testid="OutputStreamAttempt"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <p
        className="text-foreground/80 text-[11px] font-medium"
        data-testid="OutputStreamAttempt-header"
        title={OUTPUT_STREAM_COPY.attemptTitle}
      >
        {header}
      </p>

      {!isOpen &&
        summary.preview.map((line) => (
          <pre
            className={PRE_CLASS}
            data-testid="OutputStreamAttempt-preview"
            key={line.id}
          >
            {line.text}
          </pre>
        ))}

      <CollapsibleTrigger className="text-muted-foreground hover:text-foreground text-[11px] underline-offset-2 hover:underline">
        {toggleLabel}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1">
        {attempt.chunks.map((chunk) => (
          <pre className={PRE_CLASS} key={chunk.id}>
            {chunk.content}
          </pre>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
