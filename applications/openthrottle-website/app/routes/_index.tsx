import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { HomeBuiltBy } from '~/routing/home/components/HomeBuiltBy';
import { HomeContext } from '~/routing/home/components/HomeContext';
import { HomeHeroV1 } from '~/routing/home/components/HomeHeroV1';
import { HomeMoveFaster } from '~/routing/home/components/HomeMoveFaster';
import { HomeVelocity } from '~/routing/home/components/HomeVelocity';
import { HomeWorkflows } from '~/routing/home/components/HomeWorkflows';
import { SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';
// import { HomeOpenSource } from '~/routing/home/components/HomeOpenSource';
// import { HomeFeatures } from '~/routing/home/components/HomeFeatures';
// import { HomeHeroV2 } from '~/routing/home/components/HomeHeroV2';
// import { HomeHeroV3 } from '~/routing/home/components/HomeHeroV3';
// import { HomeHeroV4 } from '~/routing/home/components/HomeHeroV4';
// import { HomeHeroV5 } from '~/routing/home/components/HomeHeroV5';

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
    <>
      <HomeHeroV1 />
      <HomeContext />
      <HomeWorkflows />
      <HomeBuiltBy />
      <HomeMoveFaster />
      <HomeVelocity />
    </>
  );
}

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

export const ErrorBoundary = GlobalErrorBoundary;
