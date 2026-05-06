import * as React from 'react';
import {
  GlobalHeading,
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { BookOpenIcon } from 'lucide-react';
import { GlobalErrorBoundary } from '~/global/components/GlobalErrorBoundary';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/legal.license';

type LoaderData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<LoaderData> = {
  breadcrumb: (_match) => 'License',
  links: (_match) => [{ children: 'Legal', to: '/legal' }],
};

export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `License | ${SITE_TITLE}` }];
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
          title="License"
        />
        <p className="text-sm text-muted-foreground">
          Open source and third-party license notices will be published here.
        </p>
      </div>
    </GlobalScreen>
  );
}

export const ErrorBoundary = GlobalErrorBoundary;
