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
import {
  artwork,
  buildOrganizationJsonLd,
  buildSeoMeta,
  buildWebsiteJsonLd,
  OPENTHROTTLE_AUTHOR,
  OPENTHROTTLE_BUCKET,
  OPENTHROTTLE_GITHUB_URL,
  OPENTHROTTLE_META_DESCRIPTION,
  serializeJsonLd,
  useNonce,
} from '@openthrottle/react-router-utils';
import { GlobalErrorBoundary } from '@openthrottle/react-router-ui-global';
// import { GlobalHeader } from '~/global/components/GlobalHeader';
import { SITE_TITLE } from '#/app/global/config/settings';
import stylesheet from '~/styles.css?url';
import type { Route } from '@/app/+types/root';

export const links: Route.LinksFunction = () => {
  return [{ href: stylesheet, rel: 'stylesheet' }];
};

/**
 * Default Open Graph / Twitter share image. Uses the largest branding icon in
 * the production assets bucket so shared link previews are never blank.
 */
const SITE_OG_IMAGE = `${OPENTHROTTLE_BUCKET}/branding/icons/red/icon-512.png`;

/**
 * @external https://reactrouter.com/start/framework/route-module#shouldrevalidate
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

  const _header = request.headers.get('cookie');
  const env = getEnvironment();
  const repo = `openthrottle/openthrottle`;

  // NOTE: The GitHub stars count is intentionally not fetched here. A blocking,
  // uncached, untimed `fetch` in the root loader runs on every SSR request and
  // would mostly fail in production (GitHub's unauthenticated rate limit is
  // 60/hr/IP) while adding latency/TTFB. The value is only consumed by
  // `OpenThrottleProductGetStarted`, which is gated behind the beta flag on the
  // home route. When the beta gate is lifted, refetch this in the home route
  // loader behind a short-TTL cache + `AbortController` timeout + graceful
  // fallback rather than reinstating it here.
  return { env, repo };
};

/**
 * @link https://reactrouter.com/start/framework/route-module#meta
 */
export const meta = (_args: Route.MetaArgs) => {
  return buildSeoMeta({
    description: OPENTHROTTLE_META_DESCRIPTION,
    image: SITE_OG_IMAGE,
    siteName: SITE_TITLE,
    title: `Welcome | ${SITE_TITLE}`,
    url: APP_URL,
  });
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

  // Favicons are served from the app's own static `public/` assets (a single
  // source of truth) rather than the GCS bucket, so they match the committed
  // `public/favicon.{ico,png}` files and don't depend on bucket availability.
  const faviconIco = `/favicon.ico`;
  const faviconPng = `/favicon.png`;
  const manifest = `/manifest.json`;

  const viewport = `initial-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width`;

  // Structured data so search engines and social platforms can render rich
  // results for the organization and the site as a whole.
  const jsonLd = serializeJsonLd([
    buildOrganizationJsonLd({
      founderName: OPENTHROTTLE_AUTHOR,
      logo: SITE_OG_IMAGE,
      name: SITE_TITLE,
      sameAs: [OPENTHROTTLE_GITHUB_URL],
      url: APP_URL,
    }),
    buildWebsiteJsonLd({
      description: OPENTHROTTLE_META_DESCRIPTION,
      name: SITE_TITLE,
      url: APP_URL,
    }),
  ]);

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

        {/*
          The canonical URL is emitted per-route via `meta()` (see route
          modules) so it can vary per page. Don't hard-code a single canonical
          here — that would conflict with the route-level one.
        */}
        {/*
          Dead preconnects, kept for reference (plan bd397d4e, task a8524796):
          no font stylesheet, S3 image reference, or GTM script exists in this
          app, and the CSP is self-only + nonces. Re-enable one only when the
          matching origin actually ships (and add it to the CSP config).
        */}
        {/* <link href="https://fonts.googleapis.com" rel="preconnect" /> */}
        {/* <link href="https://fonts.gstatic.com" rel="preconnect" /> */}
        {/* <link href="https://s3-us-west-1.amazonaws.com" rel="preconnect" /> */}
        {/* <link href="https://www.googletagmanager.com" rel="preconnect" /> */}
        <link href={faviconPng} rel="apple-touch-icon" sizes="48x48" />
        <link href={faviconIco} rel="icon" type="image/x-icon" />
        <link href={faviconPng} rel="icon" type="image/png" />
        <link href={manifest} rel="manifest" />

        {/* crossOrigin is set to use-credentials to make use of the nonce. */}
        <Links crossOrigin="use-credentials" nonce={nonce} />

        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
          id="ot-json-ld"
          nonce={nonce}
          type="application/ld+json"
        />

        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: artwork }}
          id="ot-artwork"
          nonce={nonce}
        />
      </head>
      <body className="flex min-h-screen flex-col">
        {/* <GlobalHeader /> */}
        {children}
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
