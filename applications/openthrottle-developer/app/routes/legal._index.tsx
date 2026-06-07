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

        <div className="text-sm max-w-3xl text-muted-foreground space-y-4 md:space-y-8">
          <p>
            This site is a personal portfolio and developer playground operated
            by Matthew Scholta. It is provided free of charge, on an as-is
            basis, primarily to showcase open source work and experiments. It is
            not a commercial product or service, and there is no service-level
            agreement, uptime guarantee, or commitment to maintain any
            particular feature.
          </p>
          <ul className="list-disc space-y-1 list-inside">
            <li>
              <Link
                className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
                to="/legal/license"
              >
                License
              </Link>
            </li>
            <li>
              <Link
                className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
                to="/legal/privacy-policy"
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                className="hover:underline underline-offset-4 hover:text-foreground transition-colors"
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
