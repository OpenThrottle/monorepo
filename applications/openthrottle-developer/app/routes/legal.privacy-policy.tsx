import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.privacy-policy';

export const handle: GlobalLayoutBreadcrumbsHandle = {
  breadcrumb: (_match) => 'Privacy policy',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Privacy policy | ${SITE_TITLE}` }];
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
          title="Privacy policy"
        />
        <p className="text-sm text-muted-foreground">
          Privacy policy content will be published here.
        </p>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
