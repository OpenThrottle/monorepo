import { IS_PRODUCTION } from '../config/environment';

/**
 * @description Shared, level-gated logging facade for the React Router apps.
 *
 * This is intentionally thin: it delegates to the platform `console` so the API
 * stays drop-in compatible with existing `logger.error(...)` / `logger.warn(...)`
 * call sites. The only behavior it adds is level gating — the low-severity,
 * high-volume methods (`debug`, `log`, `info`) are suppressed in production so
 * verbose dev output does not leak into prod, while `warn` and `error` always
 * pass through.
 *
 * Redaction and a Rollbar bridge (the package already owns `ROLLBAR_TOKEN`) are
 * deliberately out of scope here; route error reporting through the dedicated
 * Rollbar integration rather than expanding this facade.
 *
 * @public
 */
const noop = (): void => {};

const gated = IS_PRODUCTION ? noop : console.debug.bind(console);

export const logger = {
  /** Verbose diagnostics. Suppressed in production. */
  debug: gated,
  /** Always emitted. */
  error: console.error.bind(console),
  /** Informational. Suppressed in production. */
  info: IS_PRODUCTION ? noop : console.info.bind(console),
  /** General-purpose log. Suppressed in production. */
  log: IS_PRODUCTION ? noop : console.log.bind(console),
  /** Always emitted. */
  warn: console.warn.bind(console),
} as const;
