import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import {
  FEATURES,
  OpenThrottleProductFeatures,
  OpenThrottleProductGetStarted,
} from '@openthrottle/react-router-ui';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';
import { HomeHeroV1 } from '~/routing/home/components/HomeHeroV1';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'OpenThrottle',
  links: (_match) => [],
};

export const loader = async (_args: Route.LoaderArgs) => {
  return {};
};

export const links: Route.LinksFunction = () => {
  return [];
};

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
    <GlobalScreen className="flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12">
      <div className="my-20">
        <OpenThrottleProductGetStarted />
      </div>
      <OpenThrottleProductFeatures features={FEATURES} />
      <HomeHeroV1 className="mt-20 items-center scale-75" />
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
