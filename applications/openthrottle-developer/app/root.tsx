import * as React from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  APP_URL,
  getEnvironment,
  getPublicEnv,
} from '@openthrottle/react-router-utils';
import {
  GlobalErrorBoundary,
  GlobalLayout,
  GlobalLayoutHeader,
  GlobalMetrics,
  GlobalProviders,
} from '@openthrottle/react-router-ui-global';
import type { GlobalLayoutHeaderSearchEvent } from '@openthrottle/react-router-ui-global';
import {
  data,
  Links,
  Meta,
  Outlet,
  redirect,
  redirectDocument,
  Scripts,
  ScrollRestoration,
  useFetcher,
  useLoaderData,
  useLocation,
  useRevalidator,
} from 'react-router';
import type {
  MiddlewareFunction,
  ShouldRevalidateFunction,
} from 'react-router';
import {
  OpenThrottleCommander,
  usePlanRefResolver,
} from '@openthrottle/react-router-ui';
import type { PlanRefResolverData } from '@openthrottle/react-router-ui';
import {
  buildThemeStylesheet,
  THEMES,
  Toaster,
} from '@openthrottle/react-router-shadcn';
import {
  authMiddleware,
  buildAuthCookie,
  getAuthTokenFromCookie,
  getClearAuthCookieHeader,
} from '@openthrottle/react-router-auth';
import {
  artwork,
  buildAppearanceRootCssBlock,
  buildThemePrehydrationScript,
  FEATURE_BETA_PREVIEW,
  OPENTHROTTLE_BUCKET,
  OPENTHROTTLE_META_DESCRIPTION,
  useResolvedThemeMode,
} from '@openthrottle/react-router-utils';
import { executeGraphqlWithAuth } from '@openthrottle/react-router-graphql';
import { NotificationsStoreProvider } from '@openthrottle/react-router-notifications';
import { DeveloperRolloutProvider } from '~/global/components/DeveloperRolloutProvider';
import { NotificationsSubscriptionBridge } from '~/global/components/NotificationsSubscriptionBridge';
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
  httpStatusFromRootLoaderError,
  rootLoaderErrorMessage,
} from '~/global/utils/root-loader-diagnostics';
import { SITE_TITLE } from '#/app/global/config/settings';
import { useCommanderOptions } from '~/global/hooks/useCommanderOptions';
import { userAtom } from '~/global/data/atom.user';
import {
  dataNavigationGuest,
  dataNavigationV2,
} from '~/global/data/data.navigation';
import { CONFIG_STORAGE_KEY, configAtom } from '~/global/data/atom.config';
import type { CommanderSearchFields } from '~/global/utils/commander-empty-extras';
import {
  REGEX_UUID,
  buildCommanderEmptyStateExtras,
  parseQueueAndJobIdsFromCommanderQuery,
} from '~/global/utils/commander-empty-extras';
import { handleGlobalLayoutHeaderSearchChromeEvent } from '~/global/utils/handle-global-layout-header-search-chrome-event';
import { useNonce } from '@openthrottle/react-router-utils';
import { queueJobDetailPath } from '~/routing/queues/utils/queue-job-detail-path';
import {
  callLoginMutation,
  callLogoutMutation,
  callRegisterMutation,
} from '~/global/utils/utils.auth';
import {
  handleLoadAgentConversationMessagesIntent,
  handleSendAgentMessageIntent,
} from '~/global/utils/utils.agents-chat';
import { PROTECTED_PATH_PREFIXES } from '~/global/config/config.app';
import { useHeaderChatController } from '~/routing/home/hooks/useHeaderChatController';
import { ServerHealthObject } from '@openthrottle/openthrottle-developer-codegen';
import stylesheet from '~/styles.css?url';
import type { Route } from '@/app/+types/root';

/**
 * @external https://remix.run/docs/en/main/route/should-revalidate
 * We only need to revalidate when we login or logout which
 * is already taken care of by the auth routes. So we don't need to revalidate
 * (refetch) to data at this level.
 */
export const shouldRevalidate: ShouldRevalidateFunction = (_args) => {
  return false;
};

export const links: Route.LinksFunction = () => {
  return [{ href: stylesheet, rel: 'stylesheet' }];
};

export const middleware: MiddlewareFunction[] = [authMiddleware];

/**
 * @link https://reactrouter.com/start/framework/route-module#loader
 */
export const loader = async (args: Route.LoaderArgs) => {
  const { request, url } = args;

  const canonical: string = url.href;
  const cookieHeader = request.headers.get('cookie') ?? '';

  /**
   * Server-side env (public + server-only tiers) is read here for diagnostics
   * such as the internal GraphQL base URL below. The server-only tier (e.g.
   * `API_URL_INTERNAL`) MUST NOT reach the browser, so the loader returns only
   * {@link getPublicEnv} as `env` — that is what {@link Layout} serializes into
   * `window.env`. `ROLLBAR_TOKEN` stays in the public tier intentionally: it is
   * a Rollbar client post (write-only) token meant to ship to the browser.
   */
  const serverEnv = getEnvironment();
  const env = getPublicEnv();

  /**
   * Seed an unknown/`unconfigured` baseline (amber), never all-green: if the
   * health query is skipped or short-circuits without overwriting this, the
   * shell must not read as healthy during a real outage.
   */
  let serverHealth: ServerHealthObject = {
    api: 'unconfigured',
    database: 'unconfigured',
    redis: 'unconfigured',
    websocket: 'unconfigured',
  };

  const diagnostics: RootLoaderDiagnostics = {
    graphQlRequestBaseUrl: serverEnv.API_URL_INTERNAL.replace(/\/$/, ''),
  };

  const authToken = getAuthTokenFromCookie(cookieHeader);
  const isTokenNull = authToken === null;

  let user: UserObject | null = null;
  /** When false, the `me` query failed; do not treat as logged out for redirects. */
  let userLoadOk: boolean = isTokenNull;

  const pathname = url.pathname;
  const isProtected = PROTECTED_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && isTokenNull) {
    return redirect('/auth');
  }

  /**
   * The health probe and the `me` query are independent, so fire them
   * concurrently rather than serially (health→user). Each settles into its own
   * `*Failure` so the user-step failure can still take precedence below.
   */
  /** In development, always poll server health so API misconfiguration surfaces even when auth is off. */
  const healthProbe = async (): Promise<RootLoaderFailure | null> => {
    const t0 = Date.now();
    try {
      const response = await executeGraphqlWithAuth(
        request,
        GetRootHealthDocument,
      );

      diagnostics.healthLatencyMs = Date.now() - t0;
      serverHealth = response?.serverHealth;

      return null;
    } catch (error) {
      diagnostics.healthLatencyMs = Date.now() - t0;

      console.error('root loader: GetRootHealth failed', error);
      serverHealth = ROOT_LOADER_UNREACHABLE_HEALTH;

      const healthMessage = rootLoaderErrorMessage(error);
      const healthHttpStatus = httpStatusFromRootLoaderError(error);

      return {
        kind: classifyRootLoaderError(error),
        message: healthMessage,
        step: 'health',
        ...(healthHttpStatus != null ? { httpStatus: healthHttpStatus } : {}),
      };
    }
  };

  const userProbe = async (): Promise<RootLoaderFailure | null> => {
    if (isTokenNull) {
      return null;
    }

    const t0 = Date.now();
    try {
      const queryMyUser = await executeGraphqlWithAuth(
        request,
        GetMyUserDocument,
      );

      diagnostics.userLatencyMs = Date.now() - t0;

      user = queryMyUser.me ?? null;
      userLoadOk = true;

      return null;
    } catch (error) {
      diagnostics.userLatencyMs = Date.now() - t0;
      console.error('🚨 root loader: GetMyUser failed', error);

      user = null;
      userLoadOk = false;

      const userMessage = rootLoaderErrorMessage(error);
      const userHttpStatus = httpStatusFromRootLoaderError(error);

      return {
        kind: classifyRootLoaderError(error),
        message: userMessage,
        step: 'user',
        ...(userHttpStatus != null ? { httpStatus: userHttpStatus } : {}),
      };
    }
  };

  // Probes return their own failure so the values stay properly typed (a `let`
  // assigned only inside these closures would be narrowed back to `null`,
  // dropping `RootLoaderFailure` from the loader's inferred return type).
  const [healthFailure, userFailure] = await Promise.all([
    healthProbe(),
    userProbe(),
  ]);

  // Prefer the user-step failure when both health and user fail so the banner shows the last/most specific error.
  const rootLoaderFailure = userFailure ?? healthFailure;

  if (FEATURE_BETA_PREVIEW && userLoadOk && user === null) {
    const pathname = url.pathname;
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
    { content: OPENTHROTTLE_META_DESCRIPTION, name: 'description' },
  ];
};

/**
 * @link https://reactrouter.com/explanation/special-files#layout-export
 * Document shell only: {@link Meta}, {@link Links}, {@link Scripts}, env bootstrap,
 * body wrapper for providers that must wrap the full document, {@link Toaster}, and {@link ScrollRestoration}.
 * App-level chrome lives in the default {@link App} export (canonical split for openthrottle-xxxx / openthrottle-admin).
 */
/**
 * Theme-registry CSS (all palettes as `html[data-theme=…]` blocks) rendered
 * once in the document head so a selected palette applies on first paint.
 * Static — computed at module load.
 */
const THEME_STYLESHEET = buildThemeStylesheet(THEMES);

/**
 * Pre-hydration script (system-aware): reads the persisted appearance config
 * and applies the palette (`data-theme`) plus the resolved light/dark class on
 * `<html>` before first paint, so there is no flash-of-wrong-theme. `system`
 * mode is resolved here via `matchMedia('(prefers-color-scheme: dark)')` since
 * the server cannot know the OS preference. Shared with all RR apps via
 * {@link buildThemePrehydrationScript}.
 */
const THEME_PREHYDRATION_SCRIPT =
  buildThemePrehydrationScript(CONFIG_STORAGE_KEY);

export function Layout({ children }: { children: React.ReactNode }) {
  // Hooks
  // const data = useRouteLoaderData<typeof loader>('root');
  const data = useLoaderData();
  const [_user, setUser] = useAtom(userAtom);
  const [config] = useAtom(configAtom);
  const nonce = useNonce();

  // Resolve light/dark/system → a concrete mode, applying the `.dark` class and
  // subscribing to OS changes while in system mode (shared across RR apps).
  const isDarkTheme = useResolvedThemeMode(config.theme) === 'dark';

  // Setup
  const env = data?.env ?? {};
  const envHtml = `window.env = ${JSON.stringify(env)}`;
  const favicon = `${OPENTHROTTLE_BUCKET}/branding/icons/blue/favicon.ico`;
  const manifest = `/manifest.json`;

  const viewport = `initial-scale=1, maximum-scale=1, viewport-fit=cover, width=device-width`;
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

  const appearanceRootCss = buildAppearanceRootCssBlock(config.brand);

  // 🔌 Short Circuit

  return (
    <html
      className={isDarkTheme ? 'dark' : undefined}
      data-theme={config.themeId ?? undefined}
      lang="en"
      suppressHydrationWarning={true}
    >
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

        {/* Theme palettes (all registered themes) + pre-hydration application. */}
        <style
          dangerouslySetInnerHTML={{ __html: THEME_STYLESHEET }}
          id="ot-theme-registry"
          nonce={nonce}
          suppressHydrationWarning={true}
        />
        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: THEME_PREHYDRATION_SCRIPT }}
          id="ot-theme-hydration"
          nonce={nonce}
        />

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

        {appearanceRootCss ? (
          <style type="text/css">{`
            :root {
              ${appearanceRootCss}
            }
          `}</style>
        ) : null}

        <script
          crossOrigin="use-credentials"
          dangerouslySetInnerHTML={{ __html: artwork }}
          id="ot-artwork"
          nonce={nonce}
        />
      </head>
      <body className="relative flex h-screen flex-col">
        <div className="flex flex-1 flex-col">{children}</div>

        <Toaster />
        <ScrollRestoration nonce={nonce} />
        {/*
          Vercel Analytics is meaningful only when deployed on Vercel. In a
          self-hosted (Docker) install it injects an un-nonced inline script
          that trips the CSP and 404s on /_vercel/insights/script.js, so gate it
          on the VERCEL marker (serialized into window.env, so server and client
          agree — no hydration mismatch).
        */}
        {env.VERCEL === '1' ? <Analytics /> : null}

        {/*
          🚨 Any env added here is 100% visible to the world 🚨
          `data.env` is the public tier only (loader returns getPublicEnv()), so
          server-only keys such as API_URL_INTERNAL never reach window.env.
        */}
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

/**
 * App-level composition: providers, route chrome ({@link GlobalLayout}, header/footer toggles),
 * {@link Outlet}, and overlays ({@link OpenThrottleCommander}). Nested routes render through {@link Outlet}, not duplicated shell markup.
 */
export default function App(): React.ReactElement {
  // Hooks
  // const data = useRouteLoaderData<typeof loader>('root');
  const data = useLoaderData();
  const revalidator = useRevalidator();
  const fetcher = useFetcher();
  const planRefFetcher = useFetcher<PlanRefResolverData>();
  const groups = useCommanderOptions();
  const { pathname } = useLocation();
  const [commanderOpen, setCommanderOpen] = React.useState(false);
  const [commanderQuery, setCommanderQuery] = React.useState('');

  // Streaming chat surface for the global header ChatDialog. Runs unconditionally
  // (hook rules); only injected into GlobalProviders when authenticated, else the
  // header falls back to the legacy provider.
  const headerChat = useHeaderChatController({ enabled: data?.user != null });

  // Setup
  const headerChatSurface = data?.user != null ? headerChat : undefined;
  const isAuthRoute = pathname.startsWith('/auth');
  const isIndexRoute = pathname === '/';
  const isLegalRoute = pathname.startsWith('/legal');
  const isPromptsRoute = pathname.startsWith('/prompts/');
  const isProfileRoute = pathname.startsWith('/profile');
  const isCalendarRoute = pathname.startsWith('/calendar');
  const isScheduleRoute = pathname.startsWith('/schedule');
  const isSettingsRoute = pathname.startsWith('/settings');
  const isCreateRoute = pathname.endsWith('/create');

  const isFooterHidden = isAuthRoute || isPromptsRoute;
  const isHeaderHidden = isAuthRoute || isPromptsRoute;
  const isMetricsHidden =
    isAuthRoute ||
    isIndexRoute ||
    isLegalRoute ||
    isProfileRoute ||
    isPromptsRoute ||
    isCalendarRoute ||
    isScheduleRoute ||
    isSettingsRoute ||
    isCreateRoute;

  // Handlers
  const handleRootLoaderRetry = React.useCallback(() => {
    revalidator.revalidate();
  }, [revalidator]);

  /**
   * Root action `commander-search`: default redirects to `/search?q=…`.
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
   * Chrome search in {@link GlobalLayoutHeader}: focus opens the single commander;
   * Enter with text uses the same POST as palette empty-state search.
   */
  const handleSearchChromeEvent = React.useCallback(
    (event: GlobalLayoutHeaderSearchEvent) => {
      handleGlobalLayoutHeaderSearchChromeEvent(
        { setCommanderOpen, submitCommanderSearch },
        event,
      );
    },
    [submitCommanderSearch],
  );

  /**
   * Debounced short-id-prefix resolver: when the palette query is a short hex
   * fragment (e.g. `f5e40886`), resolve it to matching plan(s) via the
   * `/resources/resolve-plan-ref` loader (server-side `resolvePlanRef`). Full
   * UUIDs and non-id text never trigger a lookup.
   */
  const loadPlanRef = React.useCallback(
    (prefix: string) => {
      planRefFetcher.load(
        `/resources/resolve-plan-ref?prefix=${encodeURIComponent(prefix)}`,
      );
    },
    [planRefFetcher],
  );

  const { loading: planRefLoading, matches: planRefMatches } =
    usePlanRefResolver({
      data: planRefFetcher.data,
      load: loadPlanRef,
      query: commanderQuery,
      state: planRefFetcher.state,
    });

  /**
   * When the palette query matches no static commands, offer POST-backed jumps
   * (plan, queue, generator, queue/job, plan/task, indexes, workspace search)
   * plus confident `Open plan` rows for a resolved short id fragment.
   */
  const commanderEmptyExtras = React.useCallback(
    (query: string) =>
      buildCommanderEmptyStateExtras(query, {
        planRefLoading,
        planRefMatches,
        submitCommanderSearch,
      }),
    [planRefLoading, planRefMatches, submitCommanderSearch],
  );

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <NotificationsStoreProvider>
        <DeveloperRolloutProvider identityKey={data?.user?.id ?? null}>
          <NotificationsSubscriptionBridge>
            <GlobalProviders
              chat={headerChatSurface}
              chatPersist={data?.user != null}
            >
              <GlobalLayout
                authenticated={data?.user !== null}
                data={data?.user ? dataNavigationV2 : dataNavigationGuest}
                health={data?.serverHealth}
                overrides={{
                  footer: isFooterHidden,
                  header: isHeaderHidden,
                }}
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
                    defaultOpen={false}
                    definitionsHref="/settings/debug#server-metrics-definitions"
                    diagnosticsHref="/settings/debug#graphql-endpoint-health"
                  />
                ) : null}

                <OpenThrottleCommander
                  className="m-0! p-0!"
                  emptyStateExtras={commanderEmptyExtras}
                  emptyStateMessage={
                    <span className="block px-2 text-center text-sm leading-relaxed">
                      <span className="block font-medium">
                        Nothing matched that filter
                      </span>
                      <span className="text-muted-foreground mt-2 block text-xs">
                        <span className="block">
                          1) Keep typing to narrow the list, or 2) paste one
                          OpenThrottle UUID for plan/queue/generator/search
                          rows, or 3) paste two UUIDs with{' '}
                          <code className="text-[10px]">/</code> or a space to
                          jump to a queue job or a plan task.
                        </span>
                      </span>
                      <span className="text-muted-foreground mt-2 block text-xs">
                        When you have typed text (even if it is not a UUID), the
                        list below offers browse shortcuts and a full-text
                        search action.
                      </span>
                      <span className="text-muted-foreground mt-2 block text-[10px]">
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
                  onSearchChange={setCommanderQuery}
                  open={commanderOpen}
                  placeholder="Command, filter navigation, or paste UUID / queueId · jobId…"
                />
              </GlobalLayout>
            </GlobalProviders>
          </NotificationsSubscriptionBridge>
        </DeveloperRolloutProvider>
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
    if (jump === 'plans-index') return redirect('/plans');
    if (jump === 'queues-index') return redirect('/queues');
    if (jump === 'generators-index') return redirect('/generators');

    const idRaw = formData.get('id');
    const id2Raw = formData.get('id2');
    const id =
      typeof idRaw === 'string' && idRaw.trim().length > 0 ? idRaw.trim() : '';
    const id2 =
      typeof id2Raw === 'string' && id2Raw.trim().length > 0
        ? id2Raw.trim()
        : '';

    if (jump === 'plan-detail' && REGEX_UUID.test(id)) {
      return redirect(`/plans/${id}`);
    }

    if (jump === 'queue-detail' && REGEX_UUID.test(id)) {
      return redirect(`/queues/${id}`);
    }

    if (jump === 'generator-detail' && REGEX_UUID.test(id)) {
      return redirect(`/generators/${id}`);
    }

    if (jump === 'queue-job' && REGEX_UUID.test(id) && REGEX_UUID.test(id2)) {
      return redirect(queueJobDetailPath(id, id2));
    }

    if (jump === 'plan-task' && REGEX_UUID.test(id) && REGEX_UUID.test(id2)) {
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
      return redirect('/dashboard', {
        headers: { 'Set-Cookie': cookie },
      });
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Login failed';

      return { error: message };
    }
  }

  if (intent === 'logout') {
    try {
      const success = await callLogoutMutation();
      if (success) {
        return redirectDocument('/auth', {
          headers: { 'Set-Cookie': getClearAuthCookieHeader() },
        });
      }

      // Clear the local auth cookie even when the server reports failure so the
      // user is not left authenticated client-side after attempting to log out.
      return data(
        { error: 'Logout failed' },
        { headers: { 'Set-Cookie': getClearAuthCookieHeader() } },
      );
    } catch (error) {
      const isError = error instanceof Error;
      const message = isError ? error.message : 'Logout failed';

      // Clear the local auth cookie even when the mutation throws so the user is
      // not left authenticated client-side after attempting to log out.
      return data(
        { error: message },
        { headers: { 'Set-Cookie': getClearAuthCookieHeader() } },
      );
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

  if (intent === 'send-agent-message') {
    return handleSendAgentMessageIntent(args.request, formData);
  }

  if (intent === 'load-agent-conversation-messages') {
    return handleLoadAgentConversationMessagesIntent(args.request, formData);
  }

  return null;
};

/**
 * @link https://reactrouter.com/how-to/error-boundary
 */
export const ErrorBoundary = GlobalErrorBoundary;
