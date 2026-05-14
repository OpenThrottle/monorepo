import { MailGlobalErrorBoundary } from '~/global/components/MailGlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/settings._index';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: SITE_TITLE }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="text-center text-white/20 text-2xl font-semibold">
      <i>Coming soon...</i>
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = MailGlobalErrorBoundary;
