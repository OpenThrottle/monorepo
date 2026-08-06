import * as React from 'react';
import type { ShouldRevalidateFunction } from 'react-router';
// import { Analytics } from '@vercel/analytics/react';
import { APP_URL } from '@openthrottle/react-router-utils';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';
import {
  artwork,
  OPENTHROTTLE_BUCKET,
  OPENTHROTTLE_META_DESCRIPTION,
  useNonce,
} from '@openthrottle/react-router-utils';
import { SITE_TITLE } from '#/app/global/config/settings';
import stylesheet from '~/styles.css?url';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
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
  const { request, url } = args;

  const canonical: string = url.href;
  const _header = request.headers.get('cookie');
  const env = {
    APP_ENV: process.env.APP_ENV,
    APP_NAME: process.env.APP_NAME,
    APP_URL: process.env.APP_URL,
    APP_VERSION: process.env.APP_VERSION,
    NODE_ENV: process.env.NODE_ENV,
    ROLLBAR_TOKEN: process.env.ROLLBAR_TOKEN,
  };

  return { canonical, env };
};

/**
 * @link https://reactrouter.com/start/framework/route-module#meta
 */
export const meta = (_args: Route.MetaArgs) => {
  return [
    { title: `Welcome | ${SITE_TITLE}` },
    { content: OPENTHROTTLE_META_DESCRIPTION, name: 'description' },
  ];
};

/**
 * @link https://reactrouter.com/explanation/special-files#layout-export
 */
export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');
  const nonce = useNonce();

  // Setup
  const env = data?.env ?? {};
  const envHtml = `window.env = ${JSON.stringify(env)}`;

  const favicon = `${OPENTHROTTLE_BUCKET}/branding/icons/yellow/favicon.ico`;
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
          CSP is shipped per-request as a (report-only) response header with a
          nonce — see app/entry.server.tsx and the shared buildCsp in
          @openthrottle/react-router-utils (config in app/global/config/csp.ts)
          — not a <meta> tag and no longer via vercel.json. The nonce below
          authorizes the inline bootstrap scripts.
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

        {/* crossOrigin is set to use-credentials to make use of the nonce. */}
        <Links crossOrigin="use-credentials" nonce={nonce} />

        {/*
          CSP is shipped per-request as a (report-only) response header with a
          nonce — see app/entry.server.tsx and the shared buildCsp in
          @openthrottle/react-router-utils (config in app/global/config/csp.ts)
          — not a <meta> tag. The nonce below authorizes the inline bootstrap
          scripts.
        */}
        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: artwork }}
          id="ot-artwork"
          nonce={nonce}
        />
      </head>
      <body className="relative flex min-h-screen flex-col">
        {/* <GlobalHeader /> */}
        <main className="flex flex-1 flex-col">{children}</main>
        {/* <GlobalFooter /> */}

        <ScrollRestoration nonce={nonce} />

        {/* FIXME: Uncomment this when we have a production environment */}
        {/* <Analytics /> */}

        {/* 🚨 Any env added here is 100% visible to the world 🚨 */}
        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: envHtml }}
          id="ot-env"
          nonce={nonce}
        />

        {/* Now we add our scripts as they may use the env */}
        <Scripts nonce={nonce} />
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
