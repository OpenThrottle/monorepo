import type { BuildCspOptions } from '@openthrottle/react-router-utils';
import { ENV_SOURCE, getRequestOrigin } from '@openthrottle/react-router-utils';

/**
 * @description This app's CSP configuration, consumed by `entry.server.tsx`
 * via the shared `buildCsp` builder. Directives come from the fleet-wide
 * policy (plan bd397d4e, task dc0833be); only per-app origins and the
 * report-only flag live here. The builder forces Report-Only outside
 * `NODE_ENV=production`, so flipping `reportOnly` only affects production.
 *
 * The request's origin is passed so a relative `API_URL_EXTERNAL` (`/api`,
 * one-origin mode) still names the matching `wss:` origin in `connect-src`.
 */
export const getCspOptions = (request: Request): BuildCspOptions => ({
  additionalConnectSrc: [],
  additionalFontSrc: [],
  additionalImgSrc: [],
  additionalScriptSrc: [],
  apiUrl: ENV_SOURCE.API_URL_EXTERNAL,
  reportOnly: false,
  requestOrigin: getRequestOrigin(request),
});
