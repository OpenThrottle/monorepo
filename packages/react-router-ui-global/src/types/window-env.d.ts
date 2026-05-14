/**
 * @description Minimal `window.env` shape used by client error diagnostics and Rollbar helpers.
 * Apps may extend this via their own `global.d.ts` merge.
 */
interface Window {
  readonly env?: {
    readonly APP_ENV?: string;
    readonly APP_VERSION?: string;
    readonly NODE_ENV?: string;
    readonly ROLLBAR_TOKEN?: string;
  };
}
