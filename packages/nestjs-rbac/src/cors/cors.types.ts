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
