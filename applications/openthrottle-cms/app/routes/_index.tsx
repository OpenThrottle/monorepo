import {
  GlobalErrorBoundary,
  GlobalHeading,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';

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

export default function Component(
  _props: Route.ComponentProps,
): React.ReactElement {
  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title={SITE_TITLE}
        />
        <p className="text-muted-foreground text-sm">{SITE_DESCRIPTION}</p>
      </div>
    </GlobalScreen>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
