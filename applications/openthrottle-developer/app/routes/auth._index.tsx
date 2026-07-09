import * as React from 'react';
import clsx from 'clsx';
import { animate, useReducedMotion } from 'framer-motion';
import {
  OpenThrottleAuthForm,
  OpenThrottleLogo,
} from '@openthrottle/react-router-ui';
import {
  buildAuthCookie,
  getAuthTokenFromCookie,
} from '@openthrottle/react-router-auth';
import { data, redirect, useFetcher } from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
import { GlobalScreen } from '@openthrottle/react-router-ui-global';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { GradientMesh } from '@openthrottle/react-router-ui-global';
import { callLoginMutation } from '~/global/utils/utils.auth';
import { SITE_SUBDOMAIN, SITE_TITLE } from '~/global/config/settings';
import type { Route } from '@/app/routes/+types/_index';

/** Resting value of the GradientMesh grain overlay before the exit tween. */
const GRAIN_REST = 1.55;
/** How long the form fades out, in ms. Keep in sync with the `duration-700` class on the content wrapper below. */
const FORM_FADE_MS = 700;
/** Beat to hold on the bare gradient after the form fades, before navigating. */
const HOLD_MS = 800;

type AuthFetcherData = { error?: string; ok?: boolean };

export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);

  if (token) {
    return redirect('/dashboard');
  }

  return {};
};

// After login the action sets the auth cookie; the default post-action
// revalidation would re-run the loader above, see the token, and redirect to
// /dashboard immediately — cutting off the exit animation. Skip revalidation so
// the client stays put and navigates on its own timer.
export const shouldRevalidate: ShouldRevalidateFunction = () => false;

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
  const fetcher = useFetcher<AuthFetcherData>();
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = React.useState(0);
  const [grainOverlay, setGrainOverlay] = React.useState(GRAIN_REST);
  const [grainMixer, setGrainMixer] = React.useState(2.5);
  const [isExiting, setIsExiting] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  // Setup
  const isFormEnabled = count >= 0;
  const isSubmitting = fetcher.state !== 'idle';
  // const isFormEnabled = count >= 5;

  // Handlers
  const onIncrementCount = () => {
    if (isExiting) {
      return;
    }

    setCount(count + 1);
  };

  const onSubmit = (payload: { email: string; password: string }) => {
    // intent mirrors root.tsx's login action; the cookie is set there, but here
    // we return data (not a redirect) so the fetcher stays put to animate out.
    fetcher.submit({ ...payload, intent: 'login' }, { method: 'POST' });
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // On successful login: fade the form out (CSS opacity over FORM_FADE_MS) while
  // the grain overlay tweens to 0, hold on the bare gradient for HOLD_MS, then
  // do a full-document redirect (not SPA navigate) so the root loader re-runs
  // server-side with the new cookie and we load with fresh credentials.
  React.useEffect(() => {
    if (!fetcher.data?.ok) {
      return;
    }

    if (prefersReducedMotion) {
      window.location.assign('/dashboard');
      return;
    }

    setIsExiting(true);

    const duration = FORM_FADE_MS / 1000;
    const ease = 'easeOut';

    const grain = animate(GRAIN_REST, 0, {
      duration,
      ease,
      onUpdate: setGrainOverlay,
    });
    const mixer = animate(setGrainMixer, 0, {
      duration,
      ease,
      onUpdate: setGrainOverlay,
    });

    const timer = setTimeout(() => {
      window.location.assign('/dashboard');
    }, FORM_FADE_MS + HOLD_MS);

    return () => {
      grain.stop();
      mixer.stop();
      clearTimeout(timer);
    };
  }, [fetcher.data, prefersReducedMotion]);

  // 🔌 Short Circuit

  return (
    <GlobalScreen
      className="relative isolate flex w-full flex-1 flex-col justify-center p-4 md:p-8 lg:p-12"
      onClick={onIncrementCount}
    >
      <GradientMesh
        className={clsx('opacity-0 transition-opacity duration-1000', {
          'opacity-100': isMounted,
        })}
        distortion={0.9}
        grainMixer={grainMixer}
        grainOverlay={grainOverlay}
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
      <div
        className={clsx(
          'relative z-10 mx-auto flex h-full w-full max-w-xl flex-1 flex-col items-center justify-center gap-8 transition-opacity duration-700',
          { 'opacity-0': isExiting },
        )}
      >
        <OpenThrottleLogo className="mx-auto text-2xl" name={SITE_SUBDOMAIN} />
        {isFormEnabled ? (
          <div className="shimmer-border w-full max-w-md">
            <OpenThrottleAuthForm
              action="/"
              className="w-full"
              error={fetcher.data?.error}
              isLoading={isSubmitting || isExiting}
              onSubmit={onSubmit}
            />
          </div>
        ) : null}
      </div>
    </GlobalScreen>
  );
}

export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const email = formData.get('email');
  const password = formData.get('password');

  if (typeof email !== 'string' || typeof password !== 'string') {
    return data<AuthFetcherData>({ error: 'Email and password are required' });
  }

  try {
    const token = await callLoginMutation(email.trim(), password);
    if (!token) {
      return data<AuthFetcherData>({ error: 'Login failed' });
    }

    // Set the cookie via headers and return data (not a redirect): a fetcher
    // follows redirects, which would navigate before the exit animation runs.
    // The client navigates to /dashboard once the choreography completes.
    return data<AuthFetcherData>(
      { ok: true },
      { headers: { 'Set-Cookie': buildAuthCookie(token) } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed';

    return data<AuthFetcherData>({ error: message });
  }
};

export const ErrorBoundary = GlobalErrorBoundary;
