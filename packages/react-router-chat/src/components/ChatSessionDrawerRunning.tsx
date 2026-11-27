import { formatDuration } from '@openthrottle/nodejs-utils';
import { Bot, ListOrdered, Wrench } from 'lucide-react';
import * as React from 'react';

import { ELAPSED_DURATION_OPTIONS } from '../config/elapsed-duration-options';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import { useElapsedMs } from '../hooks/useElapsedMs';
import { deriveRunPhaseFromEvents } from '../run-phase';
import type { ChatMessage, ChatQueuedMessage } from '../types';
import { CHAT_RUN_PHASE } from '../types';
import { summarizeSessionRunning } from '../utils/session-running';
import { RunningIndicator } from './RunningIndicator';

export interface ChatSessionDrawerRunningProps {
  /** True while a turn is in flight (the host's streaming flag). */
  readonly isStreaming: boolean;
  /** The thread the drawer summarizes. */
  readonly messages: readonly ChatMessage[];
  /** Messages sent mid-turn and waiting their turn, oldest first. */
  readonly queuedMessages: readonly ChatQueuedMessage[] | undefined;
}

/**
 * @description Body of the session drawer's Running section: the turn's phase
 * and a ticking elapsed time, the tool calls and subagents still running, and
 * the messages queued behind the turn. Shows a muted line when nothing is
 * running or queued.
 *
 * @public
 */
export const ChatSessionDrawerRunning = (
  props: ChatSessionDrawerRunningProps,
): React.ReactElement => {
  const { isStreaming, messages, queuedMessages = [] } = props;

  // Hooks
  const { elapsedMs } = useElapsedMs({
    isActive: isStreaming,
    startedAt: undefined,
  });

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.running;
  const { agents, message, tools } = summarizeSessionRunning(messages);
  const hasEvents = (message?.events ?? []).length > 0;
  const derived = deriveRunPhaseFromEvents(message?.events ?? []);
  const phase = hasEvents
    ? derived.phase
    : (message?.phase ?? CHAT_RUN_PHASE.waiting);
  const detail = hasEvents ? derived.detail : (message?.phaseDetail ?? null);
  const isIdle = !isStreaming && queuedMessages.length === 0;

  const iconClassName = 'text-muted-foreground size-3.5 shrink-0';

  // Handlers

  // Markup
  const listFor = (
    testId: string,
    title: string,
    icon: React.ReactNode,
    items: readonly { readonly key: string; readonly label: string }[],
  ) => {
    if (items.length === 0) {
      return null;
    }

    return (
      <div className="flex flex-col gap-1" data-testid={testId}>
        <h3 className="text-muted-foreground text-xs font-medium">{title}</h3>
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li className="flex items-center gap-2 text-sm" key={item.key}>
              {icon}
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  const turnRow = (
    <div className="flex items-center justify-between gap-2">
      <RunningIndicator detail={detail} elapsedMs={elapsedMs} phase={phase} />
      <span
        aria-label={copy.elapsed}
        className="text-muted-foreground text-xs tabular-nums"
        data-testid="ChatSessionDrawerRunning-elapsed"
      >
        {formatDuration(elapsedMs ?? 0, ELAPSED_DURATION_OPTIONS)}
      </span>
    </div>
  );
  const queuedItems = queuedMessages.map((item) => ({
    key: item.id,
    label: item.message,
  }));

  const toolsList = listFor(
    'ChatSessionDrawerRunning-tools',
    copy.tools,
    <Wrench aria-hidden={true} className={iconClassName} />,
    tools,
  );
  const agentsList = listFor(
    'ChatSessionDrawerRunning-agents',
    copy.agents,
    <Bot aria-hidden={true} className={iconClassName} />,
    agents,
  );
  const queuedList = listFor(
    'ChatSessionDrawerRunning-queued',
    `${copy.queued} · ${queuedItems.length}`,
    <ListOrdered aria-hidden={true} className={iconClassName} />,
    queuedItems,
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (isIdle) {
    return (
      <p
        className="text-muted-foreground p-4 text-xs"
        data-testid="ChatSessionDrawerRunning"
      >
        {copy.idle}
      </p>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4"
      data-testid="ChatSessionDrawerRunning"
    >
      {isStreaming ? turnRow : null}
      {toolsList}
      {agentsList}
      {queuedList}
    </div>
  );
};
