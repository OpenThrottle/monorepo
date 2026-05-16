import * as React from 'react';
import type { ShouldRevalidateFunction } from 'react-router';
// import { Analytics } from '@vercel/analytics/react';
import {
  APP_URL,
  artwork,
  getEnvironment,
  OPEN_THROTTLE_BUCKET,
  OPEN_THROTTLE_META_DESCRIPTION,
} from '@openthrottle/react-router-utils';
import {
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from 'react-router';
import { executeGraphql } from '@openthrottle/react-router-graphql';
import {
  buildAuthCookie,
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
} from '@openthrottle/react-router-auth';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { Toaster } from '@openthrottle/react-router-shadcn';
import {
  GlobalProviders,
  GlobalLayout,
  GlobalMetrics,
  GlobalLayoutHeader,
} from '@openthrottle/react-router-ui-global';
import { GaugeIcon } from 'lucide-react';
import {
  GetMeDocument,
  LoginDocument,
  SignoutDocument,
  UserObject,
} from '~/__generated__/graphql';
import { SITE_TITLE } from '#/app/global/config/settings';
import type { Route } from '@/app/+types/root';
import stylesheet from '~/styles.css?url';

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

  const cookieHeader = request.headers.get('cookie') ?? '';
  const token = getAuthTokenFromCookie(cookieHeader);
  const isIndexRoute = new URL(request.url).pathname === '/';

  let user: UserObject | null = null;

  try {
    if (token) {
      const res = await executeGraphqlWithAuth(request, GetMeDocument);
      user = res.me ?? null;
    }
  } catch (error) {
    console.error('Failed to load user session in root loader', error);
  }

  // 🔒 No user and any non-index route, so redirect to index
  if (!isIndexRoute && !user) {
    return redirect('/');
  }

  // 🔑 We have a user and are on the index route, so redirect to dashboard
  if (isIndexRoute && user) {
    return redirect('/dashboard');
  }

  const canonical: string = request.url;
  const _header = request.headers.get('cookie');
  const env = getEnvironment();

  return { canonical, env, user };
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
 * @description Document shell only: html/head/body, Links/Meta/Scripts, env bootstrap,
 * and a thin flex region / Layout for the Application.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');

  // Setup
  const env = data?.env ?? {};
  const html = `window.env = ${JSON.stringify(env)}`;

  const favicon = `${OPEN_THROTTLE_BUCKET}/branding/icons/orange/favicon.ico`;
  const manifest = '/manifest.json';

  const isProduction = process.env.NODE_ENV === 'production';
  const source = isProduction ? `https://*` : `http://*`;
  const viewport = `initial-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width`;
  const _valueCSP = isProduction
    ? `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`
    : `default-src 'self'; child-src 'none'; connect-src 'self' ${source}; img-src 'self' ${source}; script-src 'self' 'unsafe-inline' ${source}; style-src 'self' 'unsafe-inline'; worker-src 'self';`;

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
        <div className="flex flex-1 flex-col">{children}</div>

        <Toaster />
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
  // Hooks
  const { pathname } = useLocation();

  // Setup
  const isAuthRoute = pathname.startsWith('/auth');
  const isPromptsRoute = pathname.startsWith('/prompts/');

  const isProfileRoute = pathname.startsWith('/profile');
  const isSettingsRoute = pathname.startsWith('/settings');
  const isCreateRoute = pathname.endsWith('/create');

  const isFooterHidden = isAuthRoute || isPromptsRoute;
  const isHeaderHidden = isAuthRoute || isPromptsRoute;
  const isMetricsHidden =
    isAuthRoute ||
    isProfileRoute ||
    isPromptsRoute ||
    isSettingsRoute ||
    isCreateRoute;

  // Handlers

  return (
    <>
      <GlobalProviders>
        <GlobalLayout
          data={{
            items: [
              {
                children: 'Dashboard',
                icon: GaugeIcon,
                to: '/dashboard',
              },
            ],
          }}
          overrides={{ footer: isFooterHidden }}
        >
          {!isHeaderHidden ? <GlobalLayoutHeader /> : null}
          <Outlet />
          {!isMetricsHidden ? <GlobalMetrics /> : null}
        </GlobalLayout>
      </GlobalProviders>
    </>
  );
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

  return data?.login?.accessToken ?? null;
}

/**
 * @description Handles signout: calls signout mutation, clears auth cookie, redirects to /.
 * @link https://reactrouter.com/start/framework/route-module#action
 */
export const action = async (args: Route.ActionArgs) => {
  const { request } = args;
  const formData = await request.formData();
  const intent = formData.get('intent');

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

      // console.log('🟢  login success', cookie);

      return redirect('/dashboard', {
        headers: { 'Set-Cookie': cookie },
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Login failed';

      return { error: message };
    }
  }

  if (intent === 'signout') {
    try {
      await executeGraphqlWithAuth(request, SignoutDocument);
    } catch (error) {
      console.error('🔴 signout - action', error);
      // Still clear cookie and redirect if server signout fails (e.g. token already invalid)
    }

    return redirect('/', {
      headers: {
        'Set-Cookie': getClearAuthCookieHeader(),
      },
    });
  }

  return null;
};

/**
 * @link https://reactrouter.com/how-to/error-boundary
 */
// export const ErrorBoundary = GlobalErrorBoundary;
