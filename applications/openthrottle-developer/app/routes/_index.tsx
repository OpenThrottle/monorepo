import { FEATURE_BETA_PREVIEW } from '@openthrottle/react-router-utils';
import {
  GlobalLayoutBreadcrumbsHandle,
  GlobalScreen,
} from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { HomeComingSoon } from '~/routing/home/components/HomeComingSoon';
import { HomeFeatures } from '~/routing/home/components/HomeFeatures';
import { HomeHeroV1 } from '~/routing/home/components/HomeHeroV1';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

type HandleData = Route.ComponentProps['loaderData'];

export const handle: GlobalLayoutBreadcrumbsHandle<HandleData> = {
  breadcrumb: (_match) => 'Get Started',
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

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen className="flex flex-col p-4 md:p-8 lg:p-12 gap-4 md:gap-8 lg:gap-12">
      {FEATURE_BETA_PREVIEW ? (
        <>
          <HomeHeroV1 className="flex-1 flex h-full min-h-svh items-center" />
          {/* <HomeBuiltWith /> */}
          <HomeFeatures />
        </>
      ) : (
        <HomeComingSoon className="flex-1 flex items-center" />
      )}
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
