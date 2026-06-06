import * as React from 'react';
import { getMockMessages } from '~/global/data/mock.mail';
import { MailGlobalErrorBoundary } from '~/global/components/MailGlobalErrorBoundary';
import { MAIL_FOLDER_IDS } from '~/types/mail';
import { MessageList } from '~/routing/inbox/components/MessageList';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_layout.mail.sent';

// Sent folder list; same MessageList as inbox. Wire to API when backend is ready.
export const loader = async (_args: Route.LoaderArgs) => {
  const messages = getMockMessages(MAIL_FOLDER_IDS.sent);

  return { messages };
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

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <MessageList folderId={MAIL_FOLDER_IDS.sent} messages={messages} />;
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = MailGlobalErrorBoundary;
