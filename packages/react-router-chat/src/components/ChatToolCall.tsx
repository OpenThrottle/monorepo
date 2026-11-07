import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, Wrench } from 'lucide-react';
import * as React from 'react';

import { STATUS_CONFIG } from '../data/data.chat-tool-call-status-config';
import { CHAT_TOOL_CALL_COPY } from '../data/data.copy';
import type { ChatTurnToolEvent } from '../types';
import { ChatToolStatus } from '../types';
import { formatJsonPayload } from '../utils/index';
import { ToolPayload } from './ToolPayload';

export interface ChatToolCallProps {
  /** Whether the card starts expanded. Defaults to open when the call failed. */
  readonly defaultOpen?: boolean;
  /** The correlated tool event from the turn's structured events. */
  readonly event: ChatTurnToolEvent;
}

/**
 * @description A correlated tool_call/tool_result rendered as a single
 * collapsible tool card: tool name + a status Badge (running / succeeded /
 * failed) in the always-visible header, with expandable pretty-printed
 * arguments and result. Failed calls surface their error inline (role=alert)
 * and start expanded. Large payloads are scroll-bounded so they never blow out
 * the thread layout. Status is conveyed by icon + label, not color alone.
 *
 * Tool payloads are untrusted backend output, rendered as escaped preformatted
 * text via {@link Markdown} (never injected as live DOM).
 *
 * @public
 */
export const ChatToolCall = (props: ChatToolCallProps): React.ReactElement => {
  const { defaultOpen, event } = props;

  // Hooks

  // Setup
  const status = STATUS_CONFIG[event.status];
  const args = formatJsonPayload(event.argsJson);
  const result = formatJsonPayload(event.resultJson);
  const hasError = event.error !== null && event.error.trim() !== '';
  const startOpen = defaultOpen ?? event.status === ChatToolStatus.failed;
  const hasNoPayload = args === null && result === null;
  const isRunning = event.status === ChatToolStatus.running;
  const emptyLabel = isRunning ? 'Awaiting result…' : 'No payload.';
  const spinClassName = 'animate-spin motion-reduce:animate-none';
  const iconClassName = status.spin ? spinClassName : undefined;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-border/50 my-1 rounded-md border"
      data-testid="ChatToolCall"
      defaultOpen={startOpen}
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-2 px-2 py-1 text-xs [&[data-state=open]>span>svg:first-child]:rotate-180"
        data-testid="ChatToolCall-trigger"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          />
          <Wrench aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate font-mono">{event.name}</span>
        </span>
        <Badge color={status.color} size="xs">
          <status.Icon aria-hidden="true" className={iconClassName} />
          {status.label}
        </Badge>
      </CollapsibleTrigger>

      {hasError && (
        <p
          className="text-destructive px-2 pb-1 text-xs break-words"
          role="alert"
        >
          {event.error}
        </p>
      )}

      <CollapsibleContent
        className="space-y-2 px-2 pb-2"
        data-testid="ChatToolCall-content"
      >
        {args !== null && <ToolPayload content={args} label="Arguments" />}
        {result !== null && <ToolPayload content={result} label="Result" />}
        {hasNoPayload && (
          <p className="text-muted-foreground text-xs italic">{emptyLabel}</p>
        )}
        {event.payloadTruncated === true && (
          <p
            className="text-muted-foreground text-xs italic"
            data-testid="ChatToolCall-truncated"
          >
            {CHAT_TOOL_CALL_COPY.payloadTruncated}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
