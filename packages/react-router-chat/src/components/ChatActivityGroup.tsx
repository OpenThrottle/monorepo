import * as React from 'react';
import {
  Badge,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@openthrottle/react-router-shadcn';
import { Activity, ChevronDown } from 'lucide-react';
import { ChatThinkingBlock } from './ChatThinkingBlock';
import { ChatToolCall } from './ChatToolCall';
import { ChatToolCallGroup } from './ChatToolCallGroup';
import { STATUS_CONFIG } from '../data/chat-tool-call-status-config';
import { activeToolOf } from '../turn-tool-groups';
import type { TurnTimelineActivityGroup } from '../turn-tool-groups';

export interface ChatActivityGroupProps {
  /** Whether the run starts expanded. Collapsed by default, even while running. */
  readonly defaultOpen?: boolean;
  /** The folded run of tool groups and thinking blocks. */
  readonly group: TurnTimelineActivityGroup;
}

const ACTIVITY_LABEL = 'Activity';

/**
 * @description Everything an assistant did between two pieces of visible prose —
 * an interleaved run of tool bursts and thinking — folded into one collapsible
 * row so a long agentic turn stops pushing the reader down the page. The
 * collapsed header keeps the run legible while it streams: the active step (the
 * running tool, else the last one), how many tool calls and thinking steps have
 * landed, and an aggregate status pill that turns red the moment any nested tool
 * fails. It never auto-expands — the header carries the progress, so the view
 * stays still. Expanding reveals the nested sequence in emission order.
 *
 * @public
 */
export const ChatActivityGroup = (
  props: ChatActivityGroupProps,
): React.ReactElement => {
  const { defaultOpen = false, group } = props;

  // Hooks

  // Setup
  const status = STATUS_CONFIG[group.status];
  const active = activeToolOf(
    group.items.flatMap((item) => (item.kind === 'tools' ? item.tools : [])),
  );
  const countLabel = [
    `${group.toolCount} ${group.toolCount === 1 ? 'tool call' : 'tool calls'}`,
    group.thinkingCount > 0
      ? `${group.thinkingCount} thinking ${group.thinkingCount === 1 ? 'step' : 'steps'}`
      : null,
  ]
    .filter((part) => part !== null)
    .join(' · ');

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Collapsible
      className="border-border/50 bg-muted/20 my-1 rounded-md border"
      data-testid="ChatActivityGroup"
      defaultOpen={defaultOpen}
    >
      <CollapsibleTrigger
        className="flex w-full items-center justify-between gap-2 px-2 py-1 text-xs [&[data-state=open]>span>svg:first-child]:rotate-180"
        data-testid="ChatActivityGroup-trigger"
      >
        <span className="flex min-w-0 items-center gap-1.5 font-medium">
          <ChevronDown
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
          />
          <Activity aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
          <span className="shrink-0">{ACTIVITY_LABEL}</span>
          {active !== null ? (
            <span className="text-muted-foreground truncate font-mono">
              · {active.name}
            </span>
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
        data-testid="ChatActivityGroup-content"
      >
        {group.items.map((item) => {
          if (item.kind === 'tools') {
            const first = item.tools[0];
            const key = `tools-${first?.sortOrder ?? 0}`;

            return item.tools.length === 1 && first !== undefined ? (
              <ChatToolCall event={first} key={key} />
            ) : (
              <ChatToolCallGroup key={key} tools={item.tools} />
            );
          }

          const { event } = item;

          return event.kind === 'thinking' ? (
            <ChatThinkingBlock
              key={`thinking-${event.sortOrder}`}
              text={event.text}
            />
          ) : null;
        })}
      </CollapsibleContent>
    </Collapsible>
  );
};
