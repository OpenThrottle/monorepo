import * as React from 'react';
// import { Analytics } from '@vercel/analytics/react';
import { APP_URL, getEnvironment } from '@openthrottle/react-router-utils';
import { executeGraphql } from '@openthrottle/react-router-graphql';
import {
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLocation,
  useRouteLoaderData,
} from 'react-router';
import type { LinksFunction, ShouldRevalidateFunction } from 'react-router';
import { OpenThrottleCommander } from '@openthrottle/react-router-ui';
import { Toaster } from '@openthrottle/react-router-shadcn';
import {
  buildAuthCookie,
  getAuthTokenFromCookie,
} from '@openthrottle/react-router-auth';
import {
  artwork,
  FEATURE_BETA_PREVIEW,
  OPEN_THROTTLE_BUCKET,
  OPEN_THROTTLE_META_DESCRIPTION,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import {
  NotificationsSocketBridge,
  NotificationsStoreProvider,
} from '@openthrottle/react-router-notifications';
import {
  GetRootHealthDocument,
  LoginDocument,
  RegisterDocument,
  ServerHealthObject,
} from '~/__generated__/graphql';
import { GlobalFooter } from '~/global/components/GlobalFooter';
import { GlobalHeader } from '~/global/components/GlobalHeader';
import { GlobalMetrics } from '~/global/components/GlobalMetrics';
import { GlobalServerHealthBanner } from '~/global/components/GlobalServerHealthBanner';
import { SITE_TITLE } from '#/app/global/config/settings';
import { useCommanderOptions } from '~/routing/commander/config';
import type { Route } from '@/app/+types/root';
import stylesheet from '~/styles.css?url';

/** Path prefixes that require authentication when FEATURE_BETA_PREVIEW is on. */
const PROTECTED_PATH_PREFIXES = [
  '/dashboard',
  '/generators',
  '/notes',
  '/plans',
  '/projects',
  '/pull-requests',
  '/queues',
  '/search',
];

function decodeAuthTokenEmail(token: string): string {
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return decoded.email ?? decoded.sub ?? '';
  } catch {
    return '';
  }
}

/**
 * @description Call login GraphQL mutation on openthrottle-server. Uses API_URL (same as executeGraphql).
 */
async function callLoginMutation(
  email: string,
  password: string,
): Promise<string | null> {
  const data = await executeGraphql(LoginDocument, {
    input: { email, password },
  });

  const accessToken = data?.login?.accessToken ?? null;
  console.log('💰 💰 accessToken 💰 💰', accessToken);

  return data?.login?.accessToken ?? null;
}

/**
 * @description Call login GraphQL mutation on openthrottle-server. Uses API_URL (same as executeGraphql).
 */
async function callRegisterMutation(
  email: string,
  password: string,
): Promise<string | null> {
  const data = await executeGraphql(RegisterDocument, {
    input: { email, password },
  });

  return data.register.accessToken ?? null;
}

/**
 * @external https://remix.run/docs/en/main/route/should-revalidate
 * @description We only need to revalidate when we login or logout which
 * is already taken care of by the auth routes. So we don't need to revalidate
 * (refetch) to data at this level.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (_args) => {
  return false;
};

export const links: LinksFunction = () => {
  return [{ href: stylesheet, rel: 'stylesheet' }];
};

/**
 * @link https://reactrouter.com/start/framework/route-module#loader
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request } = args;

  const canonical: string = request.url;
  const cookieHeader = request.headers.get('cookie') ?? '';
  const env = getEnvironment();
  const isRestrictedAccess = process.env.ENABLE_AUTHENTICATION === 'true';

  let serverHealth: ServerHealthObject = {
    api: 'ok',
    database: 'ok',
    redis: 'ok',
    websocket: 'ok',
  };

  try {
    if (FEATURE_BETA_PREVIEW && isRestrictedAccess) {
      const response = await executeGraphqlWithAuth(
        request,
        GetRootHealthDocument,
      );

      serverHealth = response?.serverHealth;
    }

    const authToken = getAuthTokenFromCookie(cookieHeader);
    const isTokenNull = authToken === null;

    const user = !isTokenNull
      ? { email: decodeAuthTokenEmail(authToken) }
      : null;

    console.log('🧩 🧩 authToken 🧩 🧩', authToken);
    console.log('🧩 🧩 user 🧩 🧩', user);

    if (FEATURE_BETA_PREVIEW && isRestrictedAccess && user === null) {
      const pathname = new URL(request.url).pathname;
      const isProtected = PROTECTED_PATH_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );

      if (isProtected) {
        return redirect('/auth');
      }
    }

    return { canonical, env, serverHealth, user };
  } catch (error) {
    console.error('🚨 🚨 error 🚨 🚨', error);

    return { canonical, env, serverHealth, user: null };
  }
};

/**
 * @link https://reactrouter.com/start/framework/route-module#meta
 */
export const meta = (_args: Route.MetaArgs) => {
  return [
    { title: `Welcome | ${SITE_TITLE}` },
    { content: OPEN_THROTTLE_META_DESCRIPTION, name: 'description' },
  ];
};

/**
 * @link https://reactrouter.com/explanation/special-files#layout-export
 */
export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');
  const { pathname } = useLocation();

  // Setup
  const env = data?.env ?? {};
  const isAuthRoute = pathname.startsWith('/auth');
  const html = `window.env = ${JSON.stringify(env)}`;

  const favicon = `${OPEN_THROTTLE_BUCKET}/branding/icons/blue/favicon.ico`;
  const manifest = `/manifest.json`;

  const isProduction = process.env.NODE_ENV === 'production';
  const source = isProduction ? `https://*` : `http://*`;
  const viewport = `initial-scale=1, viewport-fit=cover, width=device-width`;
  const _valueCSP = isProduction
    ? `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`
    : `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`;

  const _health = data?.serverHealth ?? {};

  const groups = useCommanderOptions();
  const commanderSearchFetcher = useFetcher();

  // Handlers
  const handleCommanderEmptyStateSearch = React.useCallback(
    (query: string) => {
      commanderSearchFetcher.submit(
        { intent: 'commander-search', q: query.trim() },
        { method: 'post' },
      );
    },

    [commanderSearchFetcher],
  );

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
      <body className="min-h-screen flex flex-col relative">
        {FEATURE_BETA_PREVIEW ? (
          <NotificationsStoreProvider>
            <NotificationsSocketBridge
              webSocketUrl={data?.env.API_URL_EXTERNAL ?? ''}
            >
              {data?.serverHealth?.database !== 'ok' && (
                <GlobalServerHealthBanner health={data?.serverHealth} />
              )}
              {!isAuthRoute && <GlobalHeader />}
              <main className="flex flex-1 flex-col">{children}</main>
              {!isAuthRoute && (
                <>
                  <GlobalMetrics />
                  <GlobalFooter health={data?.serverHealth} />
                </>
              )}
              <OpenThrottleCommander
                groups={groups}
                onEmptyStateSearch={handleCommanderEmptyStateSearch}
              />
              <Toaster />
            </NotificationsSocketBridge>
          </NotificationsStoreProvider>
        ) : (
          <>
            <GlobalHeader />
            <main className="flex flex-1 flex-col">{children}</main>
          </>
        )}

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
export const action = async (args: Route.ActionArgs) => {
  const formData = await args.request.formData();
  const intent = formData.get('intent');

  if (intent === 'commander-search') {
    const q = formData.get('q');
    const query = typeof q === 'string' ? q.trim() : '';
    const search = query ? `?q=${encodeURIComponent(query)}` : '';

    return redirect(`/search${search}`);
  }

  if (intent === 'login') {
    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string') {
      return { error: 'Email and password are required' };
    }

    try {
      const token = await callLoginMutation(email.trim(), password);
      if (!token) {
        return { error: 'Login failed' };
      }

      const cookie = buildAuthCookie(token);
      return redirect('/', {
        headers: { 'Set-Cookie': cookie },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';

      return { error: message };
    }
  }

  if (intent === 'register') {
    const email = formData.get('email');
    const password = formData.get('password');

    if (typeof email !== 'string' || typeof password !== 'string') {
      return { error: 'Email and password are required' };
    }

    try {
      const token = await callRegisterMutation(email.trim(), password);
      if (!token) {
        return { error: 'Registration failed' };
      }

      const cookie = buildAuthCookie(token);
      return redirect('/', {
        headers: { 'Set-Cookie': cookie },
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Registration failed';

      return { error: message };
    }
  }

  return null;
};

// export const action = async (_args: Route.ActionArgs) => {
//   return {};
// };

/**
 * @link https://reactrouter.com/how-to/error-boundary
 */
// export const ErrorBoundary = GlobalErrorBoundary;
