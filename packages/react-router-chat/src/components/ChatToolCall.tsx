import * as React from 'react';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Markdown,
  ScrollArea,
} from '@openthrottle/react-router-shadcn';
import { Check, ChevronDown, Loader2, Wrench, X } from 'lucide-react';
import { formatJsonPayload } from '../utils/index';
import { ChatToolStatus } from '../types';
import type {
  ChatToolStatus as ChatToolStatusType,
  ChatTurnToolEvent,
} from '../types';

export interface ChatToolCallProps {
  /** Whether the card starts expanded. Defaults to open when the call failed. */
  readonly defaultOpen?: boolean;
  /** The correlated tool event from the turn's structured events. */
  readonly event: ChatTurnToolEvent;
}

interface StatusConfig {
  readonly Icon: typeof Check;
  readonly color: 'amber' | 'green' | 'red';
  readonly label: string;
  readonly spin: boolean;
}

const STATUS_CONFIG: Record<ChatToolStatusType, StatusConfig> = {
  [ChatToolStatus.failed]: {
    Icon: X,
    color: 'red',
    label: 'failed',
    spin: false,
  },
  [ChatToolStatus.running]: {
    Icon: Loader2,
    color: 'amber',
    label: 'running',
    spin: true,
  },
  [ChatToolStatus.succeeded]: {
    Icon: Check,
    color: 'green',
    label: 'succeeded',
    spin: false,
  },
};

interface ToolPayloadProps {
  readonly content: string;
  readonly label: string;
}

/** One labeled, scroll-bounded JSON payload section (args or result). */
const ToolPayload = (props: ToolPayloadProps): React.ReactElement => {
  const { content, label } = props;

  return (
    <section className="space-y-1">
      <p className="text-muted-foreground text-[0.7rem] font-medium tracking-wide uppercase">
        {label}
      </p>
      <ScrollArea className="max-h-48 rounded border">
        <Markdown
          className="text-xs break-words [&_pre]:whitespace-pre-wrap"
          content={content}
        />
      </ScrollArea>
    </section>
  );
};

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
 * @publicApi
 */
export const ChatToolCall = (props: ChatToolCallProps): React.ReactElement => {
  const { defaultOpen, event } = props;

  // Setup
  const status = STATUS_CONFIG[event.status];
  const args = formatJsonPayload(event.argsJson);
  const result = formatJsonPayload(event.resultJson);
  const hasError = event.error !== null && event.error.trim() !== '';
  const startOpen = defaultOpen ?? event.status === ChatToolStatus.failed;

  // 🔌 Short Circuit

  // Markup
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
          <status.Icon
            aria-hidden="true"
            className={
              status.spin
                ? 'animate-spin motion-reduce:animate-none'
                : undefined
            }
          />
          {status.label}
        </Badge>
      </CollapsibleTrigger>

      {hasError ? (
        <p
          className="text-destructive px-2 pb-1 text-xs break-words"
          role="alert"
        >
          {event.error}
        </p>
      ) : null}

      <CollapsibleContent
        className="space-y-2 px-2 pb-2"
        data-testid="ChatToolCall-content"
      >
        {args !== null ? (
          <ToolPayload content={args} label="Arguments" />
        ) : null}
        {result !== null ? (
          <ToolPayload content={result} label="Result" />
        ) : null}
        {args === null && result === null ? (
          <p className="text-muted-foreground text-xs italic">
            {event.status === ChatToolStatus.running
              ? 'Awaiting result…'
              : 'No payload.'}
          </p>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
};
