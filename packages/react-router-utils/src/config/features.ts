import { ENV_SOURCE } from './environment';

/**
 * Parses a string-encoded boolean env value. Recognizes `true`/`1`/`yes`
 * (case-insensitive) as `true` and `false`/`0`/`no` as `false`; falls back to
 * `defaultValue` when the value is missing or unrecognized.
 */
const parseEnvBoolean = (
  value: string | undefined,
  defaultValue: boolean,
): boolean => {
  if (value == null) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }

  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }

  return defaultValue;
};

/**
 * Gates the developer app's beta-preview auth behavior (root loader health
 * poll + protected-path redirect). Sourced from `FEATURE_BETA_PREVIEW`;
 * defaults to `true` to preserve existing behavior, and can be explicitly
 * disabled by setting the env value to a falsy string (e.g. `false`).
 */
export const FEATURE_BETA_PREVIEW = parseEnvBoolean(
  ENV_SOURCE.FEATURE_BETA_PREVIEW,
  false,
);

export const FEATURE_CHARLIE_PREVIEW = parseEnvBoolean(
  ENV_SOURCE.FEATURE_CHARLIE_PREVIEW,
  false,
);

/**
 * Publishes the website's blog: the Blog nav/footer links, the sitemap blog
 * entries, the `/blog` routes and the RSS feed (all 404 when off). Sourced from
 * `FEATURE_BLOG_ENABLED`; defaults to `false` so the blog ships dark until the
 * API is publicly reachable. It is part of the public env tier, so the server
 * and the hydrating client agree on it.
 */
export const FEATURE_BLOG_ENABLED = parseEnvBoolean(
  ENV_SOURCE.FEATURE_BLOG_ENABLED,
  false,
);
