import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import { ComposeForm } from '~/routing/compose/components/ComposeForm';
import type { Route } from '@/app/routes/+types/_layout.mail.compose';

// Optional loader: read searchParams (replyTo, replyAll, forward) and return initialValues for ComposeForm prefill when wiring reply/forward from reading pane.
// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Compose(_props: Route.ComponentProps) {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="p-4">
      <ComposeForm />
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
