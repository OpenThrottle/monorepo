import { cn } from '@openthrottle/react-router-shadcn';
import * as React from 'react';

import { SESSION_MCP_TONE_CLASSES } from '../data/chat-session-mcp-status';
import { CHAT_SESSION_DRAWER_COPY } from '../data/copy';
import type {
  ChatMcpServer,
  ChatSessionDiffPullRequest,
  ChatSessionEnvironment,
} from '../types';
import {
  buildEnvironmentRows,
  buildMcpServerRows,
} from '../utils/session-environment';
import { ChatSessionDrawerPullRequestChip } from './ChatSessionDrawerPullRequestChip';

export interface ChatSessionDrawerEnvironmentProps {
  readonly environment: ChatSessionEnvironment | undefined;
  /**
   * The branch the checkout is on now, from its latest diff; wins over the composer's
   * `checkout.branch`, which is read once when the checkout list loads.
   */
  readonly headBranch: string | undefined;
  /** MCP servers the CLI reported at session start; the group hides when empty. */
  readonly mcpServers: readonly ChatMcpServer[];
  /** The branch's pull request, shown as a chip above the checkout row. */
  readonly pullRequest: ChatSessionDiffPullRequest | undefined;
}

/**
 * @description Body of the session drawer's Environment section: a read-only
 * list of what the conversation runs against (the branch's pull request,
 * checkout, branch, model and reasoning, permission mode, agent, MCP servers). The branch is the
 * checkout's live `headBranch` when the host has one. Rows exist only for values the composer
 * reported.
 *
 * @public
 */
export const ChatSessionDrawerEnvironment = (
  props: ChatSessionDrawerEnvironmentProps,
): React.ReactElement => {
  const { environment, headBranch, mcpServers, pullRequest } = props;

  // Hooks

  // Setup
  const copy = CHAT_SESSION_DRAWER_COPY.environment;
  const rows = buildEnvironmentRows(environment, headBranch, copy);
  const mcpRows = buildMcpServerRows(mcpServers, copy.mcp.statuses);

  // Handlers

  // Markup
  const pullRequestItem = pullRequest !== undefined && (
    <li data-testid="ChatSessionDrawerEnvironment-pullRequest">
      <ChatSessionDrawerPullRequestChip pullRequest={pullRequest} />
    </li>
  );
  const mcpGroup = mcpRows.length > 0 && (
    <li data-testid="ChatSessionDrawerEnvironment-mcp">
      <p className="text-muted-foreground mb-1 text-xs">{copy.mcp.heading}</p>
      <ul className="flex flex-col gap-1">
        {mcpRows.map((row) => (
          <li
            className="flex min-w-0 items-center gap-2 text-xs"
            data-testid={`ChatSessionDrawerEnvironment-mcp-${row.name}`}
            data-tone={row.tone}
            key={row.name}
          >
            <span
              aria-hidden={true}
              className={cn(
                'size-1.5 shrink-0 rounded-full',
                SESSION_MCP_TONE_CLASSES[row.tone],
              )}
            />
            <span className="min-w-0 flex-1 truncate" title={row.name}>
              {row.name}
            </span>
            <span className="text-muted-foreground shrink-0">{row.label}</span>
          </li>
        ))}
      </ul>
    </li>
  );
  const list = (
    <ul
      className="flex flex-col gap-2 p-4"
      data-testid="ChatSessionDrawerEnvironment"
    >
      {pullRequestItem}
      {rows.map((row) => {
        const Icon = row.icon;
        const detailNode = row.detail != null && (
          <p className="text-muted-foreground truncate">{row.detail}</p>
        );
        return (
          <li
            className="flex min-w-0 items-start gap-2 text-xs"
            data-testid={`ChatSessionDrawerEnvironment-${row.key}`}
            key={row.key}
          >
            <span
              aria-label={row.label}
              className="text-muted-foreground shrink-0"
              role="img"
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate" title={row.title}>
                {row.value}
              </p>
              {detailNode}
            </div>
          </li>
        );
      })}
      {mcpGroup}
    </ul>
  );
  const empty = (
    <p
      className="text-muted-foreground p-4 text-xs"
      data-testid="ChatSessionDrawerEnvironment"
    >
      {copy.empty}
    </p>
  );

  // Life Cycle

  // 🔌 Short Circuit
  if (rows.length === 0 && mcpRows.length === 0) return empty;

  return list;
};
