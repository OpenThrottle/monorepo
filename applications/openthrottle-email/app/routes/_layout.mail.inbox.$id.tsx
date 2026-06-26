import * as React from 'react';
import { getMockMessageById } from '~/global/data/mock.mail';
import { MailGlobalErrorBoundary } from '~/global/components/MailGlobalErrorBoundary';
import { MessageDetail } from '~/routing/inbox/components/MessageDetail';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_layout.mail.inbox.$id';

// Reading pane: load single message by id. Replace with API when backend is wired. MessageDetail uses shadcn-ui Card.
export const loader = async ({ params }: Route.LoaderArgs) => {
  const id = params.id;
  const message = id != null ? getMockMessageById(id) : undefined;

  if (id != null && message == null) {
    throw new Response('Not Found', { status: 404 });
  }

  return { message };
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
  const message = loaderData?.message;

  // Handlers — Reply/Forward use Links in MessageDetail to /mail/compose?replyTo=id; Archive/Delete to be wired to API.
  // When backend exists: onArchive could move to archive folder; onDelete could move to trash and navigate back.
  const handleArchive = () => {
    // TODO: wire to API (e.g. move to archive folder), then optionally navigate or refresh list
  };
  const handleDelete = () => {
    // TODO: wire to API (e.g. move to trash), then optionally navigate back to /mail/ or refresh list
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <MessageDetail
      message={message ?? null}
      onArchive={handleArchive}
      onDelete={handleDelete}
    />
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = MailGlobalErrorBoundary;
