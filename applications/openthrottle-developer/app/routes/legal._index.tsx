import * as React from 'react';
import { Link } from 'react-router';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal._index';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Legal',
  links: (_match) => [],
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Legal | ${SITE_TITLE}` }];
};

export default function Component(
  props: Route.ComponentProps,
): React.ReactElement {
  const { actionData: _a, loaderData: _l, matches: _m, params: _p } = props;

  return (
    <GlobalScreen>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={BookOpenIcon}
          title="Legal"
        />
        <p className="text-sm text-muted-foreground">
          Policies and terms that apply to your use of OpenThrottle Developer.
        </p>
      </div>

      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm">
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/license"
          >
            License
          </Link>
        </li>
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/privacy-policy"
          >
            Privacy policy
          </Link>
        </li>
        <li>
          <Link
            className="text-primary underline-offset-4 hover:underline"
            to="/legal/terms-of-use"
          >
            Terms of use
          </Link>
        </li>
      </ul>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
