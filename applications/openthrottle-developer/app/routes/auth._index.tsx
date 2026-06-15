import * as React from 'react';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import { getAuthTokenFromCookie } from '@openthrottle/react-router-auth';
import { redirect } from 'react-router';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GradientMesh } from '@openthrottle/react-router-ui-global';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  if (token) {
    return redirect('/dashboard');
  }

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
  const [count, setCount] = React.useState(0);

  // Setup
  const isFormEnabled = count >= 0;
  // const isFormEnabled = count >= 5;

  // Handlers
  const onIncrementCount = () => {
    setCount(count + 1);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className="relative isolate flex w-full flex-1 flex-col justify-center p-4 md:p-8 lg:p-12"
      onClick={onIncrementCount}
    >
      <GradientMesh
        className="bg-white opacity-50"
        distortion={0.9}
        grainMixer={2.5}
        grainOverlay={1.55}
        speed={0.8}
        swirl={1.6}
      />
      {/* <GradientMesh
        className="bg-black opacity-50"
        // colors={['#990000', '#8A0000', '#7A0000', '#6B0000', '#4D0000']}
        // colors={['#13171B', '#0F1216', '#0B0E10', '#060708', '#13171B']}
        // colors={['#13171B', '#2B2E32', '#424549']}
        colors={['#13171B', '#0F1216', '#343739', '#0F1216', '#13171B']}
        speed={0.8}
      /> */}
      <div className="relative z-10 mx-auto flex h-full w-full max-w-xl flex-1 flex-col items-center justify-center gap-8">
        <OpenThrottleLogo className="mx-auto text-2xl" name={SITE_SUBDOMAIN} />
        {isFormEnabled ? (
          <div className="shimmer-border w-full max-w-md">
            <OpenThrottleAuthForm action="/" className="w-full" />
          </div>
        ) : null}
      </div>
    </GlobalScreen>
  );
}

export const action = async (_args: Route.ActionArgs) => {
  return {};
};

export const ErrorBoundary = GlobalErrorBoundary;
