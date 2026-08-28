import * as React from 'react';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { ChevronDown, Layers } from 'lucide-react';
import { ChatToolCall } from './ChatToolCall';
import { STATUS_CONFIG } from '../data/chat-tool-call-status-config';
import type { ChatTurnToolEvent } from '../types';
import { activeToolOf, aggregateToolStatus } from '../turn-tool-groups';

export interface ChatToolCallGroupProps {
  /** Whether the group starts expanded. Collapsed by default, even while running. */
  readonly defaultOpen?: boolean;
  /** The consecutive tool events folded into this group (expected length ≥ 2). */
  readonly tools: readonly ChatTurnToolEvent[];
}

/**
 * @description A run of consecutive tool invocations folded into one collapsible
 * group so a burst of actions between turns does not flood the thread. The
 * collapsed header surfaces the active step (the running tool, else the last),
 * an "N actions" count, and an aggregate status pill (running / failed /
 * succeeded). Expanding reveals every member as its own {@link ChatToolCall}.
 * Always starts collapsed — including while running, since the header's active
 * step and status pill already carry the progress, and an uncontrolled
 * Collapsible that mounted open mid-run had no way back to closed.
 * Expand/collapse stays user-controllable.
 *
 * @public
 */
export const ChatToolCallGroup = (
  props: ChatToolCallGroupProps,
): React.ReactElement => {
  const { defaultOpen = false, tools } = props;

  // Hooks

  // Setup
  const aggregate = aggregateToolStatus(tools);
  const status = STATUS_CONFIG[aggregate];
  const active = activeToolOf(tools);
  const countLabel = `${tools.length} actions`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-border/50 my-1 rounded-md border"
      data-testid="ChatToolCallGroup"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-2 px-2 py-1 text-xs [&[data-state=open]>span>svg:first-child]:rotate-180"
        data-testid="ChatToolCallGroup-trigger"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          />
          <Layers aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          {active !== null ? (
            <span className="truncate font-mono">{active.name}</span>
          ) : null}
          <span className="text-muted-foreground shrink-0">· {countLabel}</span>
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

      <CollapsibleContent
        className="space-y-1 px-2 pb-2"
        data-testid="ChatToolCallGroup-content"
      >
        {tools.map((tool) => (
          <ChatToolCall
            event={tool}
            key={`${tool.callId ?? tool.name}-${tool.sortOrder}`}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
};
