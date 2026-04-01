import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { getMockMessages } from '~/global/data/mock.mail';
import { MessageList } from '~/routing/inbox/components/MessageList';
import { MAIL_FOLDER_IDS } from '~/types/mail';
import type { Route } from '@/app/routes/+types/_layout.mail.drafts';

// Drafts folder list; reuse MessageList. Wire to API when backend is ready.
export const loader = async (_args: Route.LoaderArgs) => {
  const messages = getMockMessages(MAIL_FOLDER_IDS.drafts);
  return { messages };
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Index({ loaderData }: Route.ComponentProps) {
  // Hooks

  // Setup
  const messages = loaderData?.messages ?? [];

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return <MessageList folderId={MAIL_FOLDER_IDS.drafts} messages={messages} />;
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
