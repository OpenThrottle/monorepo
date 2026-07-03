/**
 * CORS configuration for NestJS apps. Use with app.enableCors(getCorsOptions()) in main.ts.
 * @see https://docs.nestjs.com/security/cors
 */

/** Options shape accepted by NestJS enableCors(); supports env-based origin allowlist. */
export interface CorsOptions {
  readonly credentials?: boolean;
  readonly methods?: string | string[];
  readonly origin?:
    | boolean
    | string
    | string[]
    // `origin` is undefined for requests without an Origin header (same-origin
    // navigations, curl). Keeping the param wide also makes this shape
    // assignable to both @nestjs/common's and express cors's CustomOrigin.
    | ((origin: string | undefined) => boolean | string);
}

const DEFAULT_ALLOWED_METHODS = [
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
];

/**
 * @description Builds CORS options from environment variables for use with app.enableCors().
 * Env: CORS_ORIGINS (comma-separated origins; omit or "*" for allow-all), CORS_CREDENTIALS (true|false), CORS_ALLOWED_METHODS (comma-separated; optional).
 */
export function getCorsOptions(): CorsOptions {
  const originsRaw = process.env.CORS_ORIGINS?.trim();
  const credentialsRaw = process.env.CORS_CREDENTIALS?.trim().toLowerCase();
  const methodsRaw = process.env.CORS_ALLOWED_METHODS?.trim();

  const originList = originsRaw
    ? originsRaw
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
    : [];

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
  const credentials =
    credentialsRaw === undefined || credentialsRaw === ''
      ? !originIsAllowAll
      : credentialsRaw === 'true';

  const methods =
    methodsRaw === undefined || methodsRaw === ''
      ? DEFAULT_ALLOWED_METHODS
      : methodsRaw
          .split(',')
          .map((m) => m.trim().toUpperCase())
          .filter(Boolean);

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
