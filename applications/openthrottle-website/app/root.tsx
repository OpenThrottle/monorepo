// import { Analytics } from '@vercel/analytics/react';
import * as React from 'react';
import { APP_URL, getEnvironment } from '@openthrottle/react-router-utils';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
import { artwork, OPENTHROTTLE_BUCKET } from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
import { SITE_TITLE } from '#/app/global/config/settings';
import stylesheet from '~/styles.css?url';
import type { Route } from '@/app/+types/root';

export const links: Route.LinksFunction = () => {
  return [{ href: stylesheet, rel: 'stylesheet' }];
};

/**
 * @external https://remix.run/docs/en/main/route/should-revalidate
 * @description We only need to revalidate when we login or logout which
 * is already taken care of by the auth routes. So we don't need to revalidate
 * (refetch) to data at this level.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (_args) => {
  return false;
};

/**
 * @link https://reactrouter.com/start/framework/route-module#loader
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const canonical: string = args.url.href;
  const _header = request.headers.get('cookie');
  const env = getEnvironment();

  // FIXME: Replace with the actual repo when we launch
  // const repo = `facebook/react`;
  const repo = `openthrottle/openthrottle`;

  // NOTE: The GitHub stars count is intentionally not fetched here. A blocking,
  // uncached, untimed `fetch` in the root loader runs on every SSR request and
  // would mostly fail in production (GitHub's unauthenticated rate limit is
  // 60/hr/IP) while adding latency/TTFB. The value is only consumed by
  // `OpenThrottleProductGetStarted`, which is gated behind the beta flag on the
  // home route. When the beta gate is lifted, refetch this in the home route
  // loader behind a short-TTL cache + `AbortController` timeout + graceful
  // fallback rather than reinstating it here.
  return { canonical, env, repo };
};

/**
 * @link https://reactrouter.com/start/framework/route-module#meta
 */
export const meta = (_args: Route.MetaArgs) => {
  return [{ title: `Welcome | ${SITE_TITLE}` }];
};

/**
 * @link https://reactrouter.com/explanation/special-files#layout-export
 */
export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');

  // Setup
  const env = data?.env ?? {};
  const html = `window.env = ${JSON.stringify(env)}`;

  const favicon = `${OPENTHROTTLE_BUCKET}/branding/icons/red/favicon.ico`;
  const manifest = `/manifest.json`;

  const viewport = `initial-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content={viewport} name="viewport" />
        {/*
          Content-Security-Policy is delivered as an HTTP response header via
          `vercel.json` (preferred over a <meta> tag on Vercel). Keep it there.
        */}
        <Meta />

        <link href={APP_URL} rel="canonical" />
        <link href="https://fonts.googleapis.com" rel="preconnect" />
        <link href="https://fonts.gstatic.com" rel="preconnect" />
        <link href="https://s3-us-west-1.amazonaws.com" rel="preconnect" />
        <link href="https://www.googletagmanager.com" rel="preconnect" />
        <link href={favicon} rel="apple-touch-icon" sizes="48x48" />
        <link href={favicon} rel="favicon" />
        <link href={favicon} rel="icon" type="image/svg+xml" />
        <link href={favicon} rel="mask-icon" type="image/svg+xml" />
        <link href={manifest} rel="manifest" />
        <Links />

        <script dangerouslySetInnerHTML={{ __html: artwork }} />
      </head>
      <body className="flex min-h-screen flex-col">
        {children}
        <ScrollRestoration />

        {/* FIXME: Uncomment this when we have a production environment */}
        {/* <Analytics /> */}

        {/* 🚨 Any env added here is 100% visible to the world 🚨 */}
        <script dangerouslySetInnerHTML={{ __html: html }} />

        {/* Now we add our scripts as they may use the env */}
        <Scripts />
      </body>
    </html>
  );
}

export default function App(): React.ReactElement {
  return <Outlet />;
}

/**
 * @link https://reactrouter.com/start/framework/route-module#action
 */
// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

/**
 * @link https://reactrouter.com/how-to/error-boundary
 */
export const ErrorBoundary = GlobalErrorBoundary;
