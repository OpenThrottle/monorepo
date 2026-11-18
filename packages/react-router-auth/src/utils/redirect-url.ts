/**
 * @description The query parameter that carries where to go after logging in. One name across
 * every app, so a link built by one app's redirect is understood by another's login page.
 * @public
 */
export const REDIRECT_URL_PARAM = 'redirectUrl';

/**
 * @description The login route the developer and admin apps redirect to.
 * @public
 */
export const LOGIN_PATH = '/auth';

/**
 * @description Where a login lands when there is no safe `redirectUrl` to honour.
 * @public
 */
export const DEFAULT_REDIRECT_URL = '/dashboard';

// Any origin works: it only has to be one a same-origin path cannot change.
const PROBE_ORIGIN = 'http://redirect-url.invalid';

// React Router's single-fetch data requests append `.data` to the page path (`/_root.data` for
// the index) and add `_routes` to the search; neither belongs in a URL a person navigates to.
const SINGLE_FETCH_SUFFIX = '.data';
const SINGLE_FETCH_ROOT = '/_root.data';
const SINGLE_FETCH_ROUTES_PARAM = '_routes';

const isAuthPath = (pathname: string): boolean => {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
};

/**
 * @description `value` when it is a same-origin path (`/plans/abc?tab=tasks`), otherwise
 * `fallback`. Refuses absolute URLs (`https://evil.test`, `javascript:…`), protocol-relative ones
 * (`//evil.test`, `/\evil.test`, and anything a browser would normalise into one), and any `/auth`
 * route, so the login page can be neither an open redirect nor a loop.
 * @public
 */
export const getSafeRedirect = (
  value: unknown,
  fallback: string = DEFAULT_REDIRECT_URL,
): string => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return fallback;
  }

  if (value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }

  // Let the URL parser have the last word: it strips tabs and newlines and folds backslashes
  // the way a browser does, so `/\t/evil.test` resolves off-origin here exactly as it would there.
  const parsed = URL.canParse(value, PROBE_ORIGIN)
    ? new URL(value, PROBE_ORIGIN)
    : undefined;

  if (parsed === undefined || parsed.origin !== PROBE_ORIGIN) {
    return fallback;
  }

  return isAuthPath(parsed.pathname) ? fallback : value;
};

/**
 * @description The login route, carrying `redirectUrl` (a pathname plus search) when there is
 * one. With none it is the bare login path, which is what logout wants.
 * @public
 */
export const getLoginHref = (
  redirectUrl: string | undefined,
  loginPath: string = LOGIN_PATH,
): string => {
  if (redirectUrl === undefined) {
    return loginPath;
  }

  const search = new URLSearchParams({ [REDIRECT_URL_PARAM]: redirectUrl });

  return `${loginPath}?${search.toString()}`;
};

/**
 * @description The page a request was for, as a pathname plus search worth returning to after
 * login. A single-fetch `.data` request is mapped back to its page URL. Returns undefined for
 * anything that is not a GET (an action or fetcher submission is not a place to land), for the
 * root path, and for `/auth` routes.
 * @public
 */
export const getRedirectUrlFromRequest = (
  request: Request,
): string | undefined => {
  if (request.method.toUpperCase() !== 'GET') {
    return undefined;
  }

  const url = new URL(request.url);
  const pagePath = toPagePath(url.pathname);

  if (pagePath === '/' || isAuthPath(pagePath)) {
    return undefined;
  }

  // Only re-serialise when there is something to drop, so an ordinary search keeps its exact
  // encoding.
  if (url.searchParams.has(SINGLE_FETCH_ROUTES_PARAM)) {
    url.searchParams.delete(SINGLE_FETCH_ROUTES_PARAM);
  }

  return `${pagePath}${url.search}`;
};

/**
 * @description Where to send a request that has no usable session. A page GET goes to the login
 * route carrying that page. Anything else (an action, or a fetcher a page fired) has no page of its
 * own, so the page it came from stands in, read from a same-origin `Referer`: when that page is
 * already the login route its URL is kept exactly, so a stray fetcher on `/auth?redirectUrl=…`
 * cannot strip the query; otherwise the login route carries it. With no usable referer it is the
 * bare login route.
 * @public
 */
export const getLoginRedirectFromRequest = (request: Request): string => {
  if (request.method.toUpperCase() === 'GET') {
    return getLoginHref(getRedirectUrlFromRequest(request));
  }

  const referer = request.headers.get('referer');
  const requestOrigin = new URL(request.url).origin;
  const source =
    referer !== null && URL.canParse(referer) ? new URL(referer) : undefined;

  if (source === undefined || source.origin !== requestOrigin) {
    return LOGIN_PATH;
  }

  if (isAuthPath(source.pathname)) {
    return `${source.pathname}${source.search}`;
  }

  return getLoginHref(getRedirectUrlFromRequest(new Request(source)));
};

const toPagePath = (pathname: string): string => {
  if (pathname === SINGLE_FETCH_ROOT) {
    return '/';
  }

  if (pathname.endsWith(SINGLE_FETCH_SUFFIX)) {
    return pathname.slice(0, -SINGLE_FETCH_SUFFIX.length);
  }

  return pathname;
};
