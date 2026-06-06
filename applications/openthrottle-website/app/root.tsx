// import { Analytics } from '@vercel/analytics/react';
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
import {
  artwork,
  OPEN_THROTTLE_BUCKET,
} from '@openthrottle/react-router-utils';
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

  const canonical: string = request.url;
  const _header = request.headers.get('cookie');
  const env = getEnvironment();

  return { canonical, env };
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

  const favicon = `${OPEN_THROTTLE_BUCKET}/branding/icons/red/favicon.ico`;
  const manifest = `/manifest.json`;

  const isProduction = process.env.NODE_ENV === 'production';
  const source = isProduction ? `https://*` : `http://*`;
  const viewport = `initial-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width`;
  const _valueCSP = isProduction
    ? `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`
    : `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content={viewport} name="viewport" />
        {/* <meta content={_valueCSP} httpEquiv="Content-Security-Policy" /> */}
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
      <body className="min-h-screen flex flex-col">
        {/* <GlobalHeader /> */}
        <main className="flex flex-1 flex-col">{children}</main>
        {/* <GlobalFooter /> */}

        <ScrollRestoration />
        {/* FIXME: Uncomment this when we have a production environment */}
        {/* <Analytics /> */}

        {/* 🚨 Any env added here is 100% visible to the public 🚨 */}
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
// export const ErrorBoundary = GlobalErrorBoundary;
