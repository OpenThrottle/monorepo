/**
 * @description Whether the window may navigate to `url` in-app: only an
 * `http:`/`https:` URL whose parsed origin is one of `allowedOrigins`.
 * Origins are compared after parsing, never by string prefix (so
 * `http://127.0.0.1:1234.evil.test` and `http://127.0.0.1:1234@evil.test` do
 * not match). `data:` is rejected on purpose: the app loads its own error page
 * with `loadURL`, which does not raise `will-navigate`, so no page-initiated
 * navigation ever needs it.
 */
export const isAllowedNavigation = (
  url: string,
  allowedOrigins: readonly string[],
): boolean => {
  const parsed = URL.parse(url);

  if (parsed === null) {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  return allowedOrigins.includes(parsed.origin);
};
