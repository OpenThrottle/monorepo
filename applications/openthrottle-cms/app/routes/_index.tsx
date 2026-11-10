import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';

import type { Route } from '@/app/routes/+types/_index';
import { SITE_DESCRIPTION, SITE_TITLE } from '~/global/config/settings';

// export const loader = async (_args: Route.LoaderArgs) => {
//   return {};
// };

export const meta = (_args: Route.MetaArgs) => {
  return [
    { title: SITE_TITLE },
    { content: SITE_DESCRIPTION, name: 'description' },
  ];
};

export default function Component(_props: Route.ComponentProps) {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="max-w-2xl text-center text-2xl font-semibold text-white/10">
      <i>Coming soon...</i>
    </div>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
