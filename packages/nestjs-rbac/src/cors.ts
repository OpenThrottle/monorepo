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
    | ((origin: string) => boolean | string);
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

  const origin: CorsOptions['origin'] =
    originsRaw === undefined || originsRaw === '' || originsRaw === '*'
      ? true
      : originList.length === 0
        ? true
        : originList;

  const credentials =
    credentialsRaw === undefined || credentialsRaw === ''
      ? true
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
