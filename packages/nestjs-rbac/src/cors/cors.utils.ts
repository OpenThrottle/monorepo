import type { CorsOptions } from './cors.types.ts';

const DEFAULT_ALLOWED_METHODS = [
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
];

/** Splits a comma-separated env value, normalizing and dropping empty items. */
const splitCsv = (
  raw: string | undefined,
  normalize: (item: string) => string,
): string[] => {
  if (!raw) return [];
  return raw.split(',').map(normalize).filter(Boolean);
};

/** Explicit `CORS_CREDENTIALS` wins; otherwise credentials follow the origin allowlist. */
const resolveCredentials = (
  credentialsRaw: string | undefined,
  originIsAllowAll: boolean,
): boolean => {
  if (credentialsRaw === undefined || credentialsRaw === '') {
    return !originIsAllowAll;
  }
  return credentialsRaw === 'true';
};

/**
 * @description Builds CORS options from environment variables for use with app.enableCors().
 * Env: CORS_ORIGINS (comma-separated origins; omit or "*" for allow-all), CORS_CREDENTIALS (true|false), CORS_ALLOWED_METHODS (comma-separated; optional).
 */
export function getCorsOptions(): CorsOptions {
  const originsRaw = process.env.CORS_ORIGINS?.trim();
  const credentialsRaw = process.env.CORS_CREDENTIALS?.trim().toLowerCase();
  const methodsRaw = process.env.CORS_ALLOWED_METHODS?.trim();

  const originList = splitCsv(originsRaw, (o) => o.trim());

  const originIsAllowAll =
    originsRaw === undefined ||
    originsRaw === '' ||
    originsRaw === '*' ||
    originList.length === 0;

  const origin: CorsOptions['origin'] = originIsAllowAll ? true : originList;

  // Browsers reject `Access-Control-Allow-Origin: *` together with credentials,
  // so the cors middleware reflects the request origin instead — effectively
  // "allow any origin with credentials," which is an unsafe default. Require an
  // explicit CORS_CREDENTIALS=true opt-in to enable credentials when the origin
  // is allow-all. With an explicit origin allowlist, credentials default to true.
  const credentials = resolveCredentials(credentialsRaw, originIsAllowAll);

  const methods = splitCsv(methodsRaw, (m) => m.trim().toUpperCase());

  return {
    credentials,
    methods: methods.length > 0 ? methods : DEFAULT_ALLOWED_METHODS,
    origin,
  };
}

/** Alias for getCorsOptions for compatibility with existing main.ts comments. */
export function getCorsConfiguration(): CorsOptions {
  return getCorsOptions();
}
