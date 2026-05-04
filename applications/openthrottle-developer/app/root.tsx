import * as React from 'react';
// import { Analytics } from '@vercel/analytics/react';
import { APP_URL, getEnvironment } from '@openthrottle/react-router-utils';
import { executeGraphql } from '@openthrottle/react-router-graphql';
import {
  GlobalLayout,
  GlobalMetrics,
  GlobalProviders,
} from '@openthrottle/react-router-ui-global';
import {
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLocation,
  useNavigate,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import type { LinksFunction, ShouldRevalidateFunction } from 'react-router';
import type { CommanderItem } from '@openthrottle/react-router-ui';
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
import { useAtom } from 'jotai';
import { GlobalLayoutHeader } from '@openthrottle/react-router-ui-global/src/components/GlobalLayoutHeader';
import {
  GetMyUserDocument,
  GetRootHealthDocument,
  LoginDocument,
  RegisterDocument,
  ServerHealthObject,
  UserObject,
} from '~/__generated__/graphql';
import { GlobalRootLoaderFailureBanner } from '~/global/components/GlobalRootLoaderFailureBanner';
import { GlobalServerHealthBanner } from '~/global/components/GlobalServerHealthBanner';
import type {
  RootLoaderDiagnostics,
  RootLoaderFailure,
} from '~/global/utils/root-loader-diagnostics';
import {
  ROOT_LOADER_UNREACHABLE_HEALTH,
  classifyRootLoaderError,
  rootLoaderErrorMessage,
} from '~/global/utils/root-loader-diagnostics';
import { SITE_TITLE } from '#/app/global/config/settings';
import { useCommanderOptions } from '~/global/hooks/useCommanderOptions';
import { userAtom } from '~/global/data/atom.user';
import { dataNavigationV2 } from '~/global/data/data.navigation';
import type { Route } from '@/app/+types/root';
import stylesheet from '~/styles.css?url';
import { configAtom } from '~/global/data/atom.config';

/** Matches typical Cortex / RFC UUID strings pasted into the command palette. */
const CORTEX_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  '/settings',
];

export function decodeAuthTokenEmail(token: string): string {
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
  const isRestrictedAccess = process.env.APP_ENABLE_AUTHENTICATION === 'true';

  let serverHealth: ServerHealthObject = {
    api: 'ok',
    database: 'ok',
    redis: 'ok',
    websocket: 'ok',
  };

  const diagnostics: RootLoaderDiagnostics = {};
  let rootLoaderFailure: RootLoaderFailure | null = null;

  const authToken = getAuthTokenFromCookie(cookieHeader);
  const isTokenNull = authToken === null;
  let user: UserObject | null = null;
  /** When false, the `me` query failed; do not treat as logged out for redirects. */
  let userLoadOk: boolean = isTokenNull;

  if (FEATURE_BETA_PREVIEW && isRestrictedAccess) {
    const t0 = Date.now();
    try {
      const response = await executeGraphqlWithAuth(
        request,
        GetRootHealthDocument,
      );
      diagnostics.healthLatencyMs = Date.now() - t0;
      serverHealth = response?.serverHealth;
    } catch (error) {
      diagnostics.healthLatencyMs = Date.now() - t0;
      console.error('root loader: GetRootHealth failed', error);
      serverHealth = ROOT_LOADER_UNREACHABLE_HEALTH;
      rootLoaderFailure = {
        kind: classifyRootLoaderError(error),
        message: rootLoaderErrorMessage(error),
        step: 'health',
      };
    }
  }

  if (!isTokenNull) {
    const t0 = Date.now();
    try {
      const queryMyUser = await executeGraphqlWithAuth(
        request,
        GetMyUserDocument,
      );
      diagnostics.userLatencyMs = Date.now() - t0;
      user = queryMyUser.me ?? null;
      userLoadOk = true;
    } catch (error) {
      diagnostics.userLatencyMs = Date.now() - t0;
      console.error('root loader: GetMyUser failed', error);
      user = null;
      userLoadOk = false;
      if (rootLoaderFailure == null) {
        rootLoaderFailure = {
          kind: classifyRootLoaderError(error),
          message: rootLoaderErrorMessage(error),
          step: 'user',
        };
      }
    }
  }

  if (
    FEATURE_BETA_PREVIEW &&
    isRestrictedAccess &&
    userLoadOk &&
    user === null
  ) {
    const pathname = new URL(request.url).pathname;
    const isProtected = PROTECTED_PATH_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );

    if (isProtected) {
      return redirect('/auth');
    }
  }

  return {
    canonical,
    env,
    rootLoaderDiagnostics: diagnostics,
    rootLoaderFailure,
    serverHealth,
    user,
    userLoadOk,
  };
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
 * @description Document shell only: {@link Meta}, {@link Links}, {@link Scripts}, env bootstrap,
 * body wrapper for providers that must wrap the full document, {@link Toaster}, and {@link ScrollRestoration}.
 * App-level chrome lives in the default {@link App} export (canonical split for openthrottle-cms / openthrottle-admin).
 */
export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');
  const [_user, setUser] = useAtom(userAtom);

  // Setup
  const env = data?.env ?? {};
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

  // Handlers

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (data?.userLoadOk === false) {
      return;
    }
    if (data?.user) {
      setUser(data.user);
    }
  }, [data?.user, data?.userLoadOk, setUser]);

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
        <NotificationsStoreProvider>
          <NotificationsSocketBridge
            webSocketUrl={data?.env.API_URL_EXTERNAL ?? ''}
          >
            <div className="flex flex-1 flex-col">{children}</div>
          </NotificationsSocketBridge>
        </NotificationsStoreProvider>

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

/**
 * @description App-level composition: providers, route chrome ({@link GlobalLayout}, header/footer toggles),
 * {@link Outlet}, and overlays ({@link OpenThrottleCommander}). Nested routes render through {@link Outlet}, not duplicated shell markup.
 */
export default function App(): React.ReactElement {
  // Hooks
  const data = useRouteLoaderData<typeof loader>('root');
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const groups = useCommanderOptions();
  const { pathname } = useLocation();
  const [config, _setConfig] = useAtom(configAtom);

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
  const handleRootLoaderRetry = React.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  const handleSearch = React.useCallback(
    (query: string) => {
      fetcher.submit(
        { intent: 'commander-search', q: query.trim() },
        { method: 'post' },
      );
    },

    [fetcher],
  );

  /**
   * @description When the palette query is a UUID, offer quick navigation for ambiguous IDs (plan vs queue vs generator).
   */
  const commanderEmptyExtras = React.useCallback(
    (query: string): CommanderItem[] => {
      const q = query.trim();

      if (!CORTEX_UUID_PATTERN.test(q)) {
        return [];
      }

      const preview = q.slice(0, 8);

      return [
        {
          id: `jump-plan-${q}`,
          label: `Open plan (${preview}…)`,
          onSelect: () => navigate(`/plans/${q}`),
          value: `${q} open plan`,
        },
        {
          id: `jump-queue-${q}`,
          label: `Open queue (${preview}…)`,
          onSelect: () => navigate(`/queues/${q}`),
          value: `${q} open queue`,
        },
        {
          id: `jump-generator-${q}`,
          label: `Open generator (${preview}…)`,
          onSelect: () => navigate(`/generators/${q}`),
          value: `${q} open generator`,
        },
      ];
    },
    [navigate],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <GlobalProviders>
        <GlobalLayout
          data={dataNavigationV2}
          health={data?.serverHealth}
          overrides={{ footer: isFooterHidden }}
        >
          <GlobalRootLoaderFailureBanner
            diagnostics={data?.rootLoaderDiagnostics}
            failure={data?.rootLoaderFailure ?? null}
            onRetry={handleRootLoaderRetry}
            userLoadOk={data?.userLoadOk !== false}
          />

          <GlobalServerHealthBanner
            health={data?.serverHealth}
            suppress={data?.rootLoaderFailure?.step === 'health'}
          />

          {!isHeaderHidden ? <GlobalLayoutHeader /> : null}
          <Outlet />
          {!isMetricsHidden ? (
            <GlobalMetrics diagnosticsHref="/settings/debug" />
          ) : null}

          <OpenThrottleCommander
            className="m-0! p-0!"
            emptyStateExtras={commanderEmptyExtras}
            groups={groups}
            onEmptyStateSearch={handleSearch}
          />
        </GlobalLayout>
      </GlobalProviders>

      <style type="text/css">{`
        :root {
          ${config.accentColor ? `--accent: ${config.accentColor}` : ``};
          ${config.accentColor ? `--color-ring: ${config.accentColor}` : ``};
        }
      `}</style>
    </>
  );
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
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Login failed';

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
