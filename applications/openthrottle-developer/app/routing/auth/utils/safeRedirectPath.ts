/**
 * @description Where to send the browser after sign-in, from an untrusted `redirectTo`
 * query value. Only a same-origin absolute path is allowed — `/oauth/consent?request=…` —
 * never a scheme-relative `//host`, a backslash trick, or an absolute URL, so the login
 * page cannot become an open redirect. Anything else falls back to the dashboard.
 */
export const safeRedirectPath = (
  value: string | null | undefined,
  fallback: string = '/dashboard',
): string => {
  if (typeof value !== 'string' || !value.startsWith('/')) {
    return fallback;
  }
  if (
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\r\n\t]/.test(value)
  ) {
    return fallback;
  }

  const parsed = new URL(value, 'https://openthrottle.invalid');
  if (parsed.origin !== 'https://openthrottle.invalid') {
    return fallback;
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
};
