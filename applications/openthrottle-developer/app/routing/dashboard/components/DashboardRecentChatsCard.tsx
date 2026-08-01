import * as React from 'react';
import { Button, Card } from '@openthrottle/react-router-shadcn';
import { Link } from 'react-router';
import {
  formatRelativeChatTimestamp,
  type AgentConversationListItem,
} from '@openthrottle/react-router-chat';
import clsx from 'clsx';
import {
  RECENT_CHATS_CARD_COPY,
  RECENT_CHATS_CARD_DESTINATION_LABELS,
} from '~/routing/dashboard/data/data.copy';
import { WORKSPACE_FULL_JUMP_LINKS } from '~/routing/navigation/data/workspace-jump-links';

const MAX_ROWS = 3;

/** Curated footer destinations, resolved from the shared jump-link data. */
const FOOTER_DESTINATIONS = WORKSPACE_FULL_JUMP_LINKS.filter((link) =>
  RECENT_CHATS_CARD_DESTINATION_LABELS.includes(link.label),
);

export interface DashboardRecentChatsCardProps {
  className?: string;
  conversations: readonly AgentConversationListItem[];
}

/** Deep-link into a specific chat on the home route (see routes/_index.tsx). */
const conversationHref = (id: string): string =>
  `/?conversationId=${encodeURIComponent(id)}`;

/** Label for a conversation, falling back when the title is null/blank. */
const conversationLabel = (conversation: AgentConversationListItem): string =>
  conversation.title != null && conversation.title.trim() !== ''
    ? conversation.title
    : RECENT_CHATS_CARD_COPY.untitled;

/**
 * @description Dashboard "Recent chats" card: the most-recent agent
 * conversations, each row hotlinking into that chat via `?conversationId=`,
 * with a null-title fallback, a compact relative timestamp, and a subtle
 * status indicator. Renders an empty-state when there are no chats.
 */
export const DashboardRecentChatsCard = (
  props: DashboardRecentChatsCardProps,
): React.ReactElement => {
  const { className, conversations } = props;

  // Hooks

  // Setup
  const copy = RECENT_CHATS_CARD_COPY;
  const rows = conversations.slice(0, MAX_ROWS);
  const isEmpty = rows.length === 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className={clsx('gap-3 p-4', className)}
      data-testid="DashboardRecentChatsCard"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{copy.title}</h2>
      </div>

      {isEmpty ? (
        <p className="text-muted-foreground py-4 text-center text-sm">
          {copy.empty}
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {rows.map((conversation) => {
            const label = conversationLabel(conversation);
            const isActive = conversation.status === 'active';

            return (
              <li key={conversation.id}>
                <Link
                  className="hover:bg-accent/50 -mx-2 flex items-center gap-2 rounded-md px-2 py-2"
                  to={conversationHref(conversation.id)}
                  viewTransition={true}
                >
                  <span
                    aria-hidden={true}
                    className={clsx(
                      'size-2 shrink-0 rounded-full',
                      isActive ? 'bg-primary' : 'bg-muted-foreground/40',
                    )}
                    title={conversation.status}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {label}
                  </span>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                    {formatRelativeChatTimestamp(conversation.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-border flex flex-wrap gap-1.5 border-t pt-3">
        <Button asChild={true} size="xs" variant="ghost">
          <Link to="/" viewTransition={true}>
            {copy.viewAll}
          </Link>
        </Button>
        <Button asChild={true} size="xs" variant="ghost">
          <Link to="/" viewTransition={true}>
            {copy.newChat}
          </Link>
        </Button>
        {FOOTER_DESTINATIONS.map((item) => (
          <Button asChild={true} key={item.to} size="xs" variant="ghost">
            <Link to={item.to} viewTransition={true}>
              {item.label}
            </Link>
          </Button>
        ))}
      </div>
    </Card>
  );
};
