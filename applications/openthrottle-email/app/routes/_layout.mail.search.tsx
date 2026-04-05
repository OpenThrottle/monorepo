import * as React from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@openthrottle/react-router-shadcn';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { getMockSearchResults } from '~/global/data/mock.mail';
import { MessageList } from '~/routing/inbox/components/MessageList';
import type { Route } from '@/app/routes/+types/_layout.mail.search';

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const messages = getMockSearchResults(q);

  return { messages, query: q };
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData, matches: _m, params: _p } = props;

  // Hooks

  // Setup
  const messages = loaderData?.messages ?? [];
  const query = loaderData?.query ?? '';
  const hasQuery = query.trim().length > 0;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  // No search term yet: prompt to use the toolbar (search bar submits and debounced typing navigate here).
  if (!hasQuery) {
    return (
      <section
        className="flex flex-col gap-2 p-4"
        data-testid="MailSearchRoute"
      >
        <Empty
          className="min-h-[280px]"
          data-testid="MailSearchRoute-empty-no-query"
        >
          <EmptyHeader>
            <EmptyTitle>Search mail</EmptyTitle>
            <EmptyDescription>
              Enter a search term in the toolbar above. Results update as you
              type, or press Enter to search.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  // Query present but no results: search-specific empty state.
  if (messages.length === 0) {
    return (
      <section
        className="flex flex-col gap-2 p-4"
        data-testid="MailSearchRoute"
      >
        <p className="text-muted-foreground text-sm">
          Search results for &quot;{query}&quot;
        </p>
        <Empty
          className="min-h-[280px]"
          data-testid="MailSearchRoute-empty-no-results"
        >
          <EmptyHeader>
            <EmptyTitle>No results</EmptyTitle>
            <EmptyDescription>
              No messages match &quot;{query}&quot;. Try different keywords or
              check spelling.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-2" data-testid="MailSearchRoute">
      <p className="text-muted-foreground px-4 pt-2 text-sm">
        Search results for &quot;{query}&quot;
      </p>
      <MessageList messages={messages} />
    </section>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
