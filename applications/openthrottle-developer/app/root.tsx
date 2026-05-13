import * as React from 'react';
import { APP_URL, getEnvironment } from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayout,
  GlobalLayoutHeader,
  GlobalMetrics,
  GlobalProviders,
} from '@openthrottle/react-router-ui-global';
import type { GlobalLayoutHeaderSearchEvent } from '@openthrottle/react-router-ui-global';
import {
  Links,
  Meta,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLocation,
  useRevalidator,
  useRouteLoaderData,
} from 'react-router';
import type { ShouldRevalidateFunction } from 'react-router';
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
import {
  GetMyUserDocument,
  GetRootHealthDocument,
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
  parseHttpStatusFromRootLoaderMessage,
  rootLoaderErrorMessage,
} from '~/global/utils/root-loader-diagnostics';
import { SITE_TITLE } from '#/app/global/config/settings';
import { useCommanderOptions } from '~/global/hooks/useCommanderOptions';
import { userAtom } from '~/global/data/atom.user';
import { dataNavigationV2 } from '~/global/data/data.navigation';
import type { Route } from '@/app/+types/root';
import stylesheet from '~/styles.css?url';
import { configAtom } from '~/global/data/atom.config';
import type { CommanderSearchFields } from '~/global/utils/commander-empty-extras';
import {
  CORTEX_UUID_PATTERN,
  buildCommanderEmptyStateExtras,
  parseQueueAndJobIdsFromCommanderQuery,
} from '~/global/utils/commander-empty-extras';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';
import {
  callLoginMutation,
  callRegisterMutation,
} from '~/global/utils/utils.auth';
import { PROTECTED_PATH_PREFIXES } from '~/global/config/config.app';
import { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';

/**
 * @external https://remix.run/docs/en/main/route/should-revalidate
 * @description We only need to revalidate when we login or logout which
 * is already taken care of by the auth routes. So we don't need to revalidate
 * (refetch) to data at this level.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (_args) => {
  return false;
};

export const links: Route.LinksFunction = () => {
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

  const diagnostics: RootLoaderDiagnostics = {
    graphQlRequestBaseUrl: env.API_URL_INTERNAL.replace(/\/$/, ''),
  };
  let rootLoaderFailure: RootLoaderFailure | null = null;

  const authToken = getAuthTokenFromCookie(cookieHeader);
  const isTokenNull = authToken === null;
  let user: UserObject | null = null;
  /** When false, the `me` query failed; do not treat as logged out for redirects. */
  let userLoadOk: boolean = isTokenNull;

  /** In development, always poll server health so API misconfiguration surfaces even when auth is off. */
  if (FEATURE_BETA_PREVIEW) {
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
      const healthMessage = rootLoaderErrorMessage(error);
      const healthHttpStatus =
        parseHttpStatusFromRootLoaderMessage(healthMessage);
      rootLoaderFailure = {
        kind: classifyRootLoaderError(error),
        message: healthMessage,
        step: 'health',
        ...(healthHttpStatus != null ? { httpStatus: healthHttpStatus } : {}),
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
      // Prefer the user-step failure when both health and user fail so the banner shows the last/most specific error.
      const userMessage = rootLoaderErrorMessage(error);
      const userHttpStatus = parseHttpStatusFromRootLoaderMessage(userMessage);
      rootLoaderFailure = {
        kind: classifyRootLoaderError(error),
        message: userMessage,
        step: 'user',
        ...(userHttpStatus != null ? { httpStatus: userHttpStatus } : {}),
      };
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
        <div className="flex flex-1 flex-col">{children}</div>

        <Toaster />
        <ScrollRestoration />

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
  const groups = useCommanderOptions();
  const { pathname } = useLocation();
  const [config, _setConfig] = useAtom(configAtom);
  const [commanderOpen, setCommanderOpen] = React.useState(false);

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

  /**
   * @description Root action `commander-search`: default redirects to `/search?q=…`.
   * Optional `jump` + `id` / `id2` supports POST-driven debug navigation (see action handler).
   */
  const submitCommanderSearch = React.useCallback(
    (fields: CommanderSearchFields) => {
      const body: Record<string, string> = { intent: 'commander-search' };

      if (fields.id) body.id = fields.id;
      if (fields.id2) body.id2 = fields.id2;
      if (fields.jump) body.jump = fields.jump;

      if (fields.q !== undefined && fields.q !== '') {
        body.q = fields.q;
      }

      fetcher.submit(body, { method: 'post' });
    },

    [fetcher],
  );

  const handleSearch = React.useCallback(
    (query: string) => {
      submitCommanderSearch({ q: query.trim() });
    },
    [submitCommanderSearch],
  );

  /**
   * @description Chrome search in {@link GlobalLayoutHeader}: focus opens the single commander; Enter with text uses the same POST as palette empty-state search.
   */
  const handleSearchChromeEvent = React.useCallback(
    (event: GlobalLayoutHeaderSearchEvent) => {
      if (event.type === 'engage') {
        setCommanderOpen(true);
        return;
      }
      submitCommanderSearch({ q: event.query });
    },
    [submitCommanderSearch],
  );

  /**
   * @description When the palette query matches no static commands, offer POST-backed jumps (plan, queue, generator, queue/job, plan/task, indexes, workspace search).
   */
  const commanderEmptyExtras = React.useCallback(
    (query: string) =>
      buildCommanderEmptyStateExtras(query, {
        submitCommanderSearch,
      }),
    [submitCommanderSearch],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <NotificationsStoreProvider>
        <NotificationsSocketBridge
          webSocketUrl={data?.env.API_URL_EXTERNAL ?? ''}
        >
          <GlobalProviders>
            <GlobalLayout
              data={dataNavigationV2}
              health={data?.serverHealth}
              overrides={{ footer: isFooterHidden }}
            >
              <GlobalRootLoaderFailureBanner
                diagnostics={data?.rootLoaderDiagnostics}
                failure={data?.rootLoaderFailure ?? null}
                isRevalidating={revalidator.state === 'loading'}
                onRetry={handleRootLoaderRetry}
                userLoadOk={data?.userLoadOk !== false}
              />

              <GlobalServerHealthBanner
                health={data?.serverHealth}
                suppress={data?.rootLoaderFailure?.step === 'health'}
              />

              {!isHeaderHidden ? (
                <GlobalLayoutHeader
                  onSearchChromeEvent={handleSearchChromeEvent}
                />
              ) : null}
              <Outlet />
              {!isMetricsHidden ? (
                <GlobalMetrics
                  definitionsHref="/settings/debug#server-metrics-definitions"
                  diagnosticsHref="/settings/debug#graphql-endpoint-health"
                />
              ) : null}

              <OpenThrottleCommander
                className="m-0! p-0!"
                emptyStateExtras={commanderEmptyExtras}
                emptyStateMessage={
                  <span className="block px-2 text-center leading-relaxed text-sm">
                    <span className="block font-medium">
                      Nothing matched that filter
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      <span className="block">
                        1) Keep typing to narrow the list, or 2) paste one
                        Cortex UUID for plan/queue/generator/search rows, or 3)
                        paste two UUIDs with{' '}
                        <code className="text-[10px]">/</code> or a space to
                        jump to a queue job or a plan task.
                      </span>
                    </span>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      When you have typed text (even if it is not a UUID), the
                      list below offers browse shortcuts and a full-text search
                      action.
                    </span>
                    <span className="mt-2 block text-[10px] text-muted-foreground">
                      Server metrics (when visible) use{' '}
                      <code className="text-[10px]">serverMetrics</code> from
                      openthrottle-server; definitions and GraphQL health:
                      Settings → Debug.
                    </span>
                  </span>
                }
                footerHint="Debug jumps use the same POST as Search — see root action commander-search (jump, id, id2, q)."
                groups={groups}
                onEmptyStateSearch={handleSearch}
                onOpenChange={setCommanderOpen}
                open={commanderOpen}
                placeholder="Command, filter navigation, or paste UUID / queueId · jobId…"
              />
            </GlobalLayout>
          </GlobalProviders>

          {/* We can allow for more customization here as well... */}
          <style type="text/css">{`
            :root {
              ${config.accentColor ? `--accent: ${config.accentColor}` : ``};
              ${config.accentColor ? `--color-ring: ${config.accentColor}` : ``};
              ${config.accentColor ? `--color-sidebar-ring: ${config.accentColor}` : ``};
              ${config.accentColor ? `--tw-ring-color: ${config.accentColor}` : ``};
            }
          `}</style>
        </NotificationsSocketBridge>
      </NotificationsStoreProvider>
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
    const jump = formData.get('jump');
    if (jump === 'plans-index') {
      return redirect('/plans');
    }

    if (jump === 'queues-index') {
      return redirect('/queues');
    }

    if (jump === 'generators-index') {
      return redirect('/generators');
    }

    const idRaw = formData.get('id');
    const id2Raw = formData.get('id2');
    const id =
      typeof idRaw === 'string' && idRaw.trim().length > 0 ? idRaw.trim() : '';
    const id2 =
      typeof id2Raw === 'string' && id2Raw.trim().length > 0
        ? id2Raw.trim()
        : '';

    if (jump === 'plan-detail' && CORTEX_UUID_PATTERN.test(id)) {
      return redirect(`/plans/${id}`);
    }
    if (jump === 'queue-detail' && CORTEX_UUID_PATTERN.test(id)) {
      return redirect(`/queues/${id}`);
    }
    if (jump === 'generator-detail' && CORTEX_UUID_PATTERN.test(id)) {
      return redirect(`/generators/${id}`);
    }
    if (
      jump === 'queue-job' &&
      CORTEX_UUID_PATTERN.test(id) &&
      CORTEX_UUID_PATTERN.test(id2)
    ) {
      return redirect(queueJobDetailPath(id, id2));
    }
    if (
      jump === 'plan-task' &&
      CORTEX_UUID_PATTERN.test(id) &&
      CORTEX_UUID_PATTERN.test(id2)
    ) {
      return redirect(`/plans/${id}/tasks/${id2}`);
    }

    if (jump === 'queue-job' || jump === 'plan-task') {
      const qTextRaw = formData.get('q');
      const qText = typeof qTextRaw === 'string' ? qTextRaw.trim() : '';
      const pairFromQuery = parseQueueAndJobIdsFromCommanderQuery(qText);
      if (pairFromQuery) {
        const [a, b] = pairFromQuery;
        if (jump === 'queue-job') {
          return redirect(queueJobDetailPath(a, b));
        }
        return redirect(`/plans/${a}/tasks/${b}`);
      }
    }

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

/**
 * @link https://reactrouter.com/how-to/error-boundary
 */
export const ErrorBoundary = GlobalErrorBoundary;
