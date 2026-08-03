import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal._index';
import { Link } from 'react-router';
import { OPENTHROTTLE_SITE_LEGAL_POSTURE } from '@openthrottle/react-router-utils';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Legal',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Legal | ${SITE_TITLE}` }];
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
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title="Legal"
        />

        <div className="text-muted-foreground max-w-3xl space-y-4 text-sm md:space-y-8">
          <p>{OPENTHROTTLE_SITE_LEGAL_POSTURE}</p>

          <ul className="list-inside list-disc space-y-1">
            <li>
              <Link
                className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
                to="/legal/license"
              >
                License
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
                to="/legal/privacy-policy"
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                className="hover:text-foreground underline-offset-4 transition-colors hover:underline"
                to="/legal/terms-of-use"
              >
                Terms of use
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
