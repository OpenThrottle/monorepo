import * as React from 'react';
import { Button } from '@openthrottle/react-router-shadcn';
import classnames from 'classnames';
import { OPEN_THROTTLE_META_DESCRIPTION } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { getMockMessages } from '~/global/data/mock.mail';
import { MessageList } from '~/routing/inbox/components/MessageList';
import { MAIL_FOLDER_IDS } from '~/types/mail';
import type { Route } from '@/app/routes/+types/_layout.mail._index';

/** Inbox filter: show all messages or only unread. For future API, filter can be moved to loader params. */
type InboxFilter = 'all' | 'unread';

// Inbox list; replace getMockMessages with API loader when backend is wired. MessageList uses shadcn-ui Table.
export const loader = async (_args: Route.LoaderArgs) => {
  const messages = getMockMessages(MAIL_FOLDER_IDS.inbox);
  return { messages };
};

export const meta = (_args: Route.MetaArgs) => {
  return [
    { title: SITE_TITLE },
    { content: OPEN_THROTTLE_META_DESCRIPTION, name: 'description' },
  ];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks
  const [filter, setFilter] = React.useState<InboxFilter>('all');
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // Setup
  const messages = loaderData?.messages ?? [];
  const filteredMessages =
    filter === 'unread' ? messages.filter((m) => !m.read) : messages;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="flex flex-col" data-testid="inbox-page">
      {/* Filter bar: All / Unread. Styled with shadcn-ui Button for consistency. */}
      <div
        className="flex items-center gap-1 border-b px-4 py-2"
        data-testid="inbox-filter"
      >
        <Button
          className={classnames(filter === 'all' && 'bg-muted')}
          onClick={() => setFilter('all')}
          size="sm"
          variant={filter === 'all' ? 'secondary' : 'ghost'}
        >
          All
        </Button>
        <Button
          className={classnames(filter === 'unread' && 'bg-muted')}
          onClick={() => setFilter('unread')}
          size="sm"
          variant={filter === 'unread' ? 'secondary' : 'ghost'}
        >
          Unread
        </Button>
      </div>
      <MessageList
        folderId={MAIL_FOLDER_IDS.inbox}
        messages={filteredMessages}
        onSelectionChange={setSelectedIds}
        selectedIds={selectedIds}
      />
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
