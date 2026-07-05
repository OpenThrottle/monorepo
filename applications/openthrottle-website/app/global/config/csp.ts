import type { BuildCspOptions } from '@openthrottle/react-router-utils';
import { ENV_SOURCE } from '@openthrottle/react-router-utils';

/**
 * @description This app's CSP configuration, consumed by `entry.server.tsx`
 * via the shared `buildCsp` builder. Directives come from the fleet-wide
 * policy (plan bd397d4e, task dc0833be); only per-app origins and the
 * report-only flag live here. The builder forces Report-Only outside
 * `NODE_ENV=production`, so flipping `reportOnly` only affects production.
 *
 * The website policy is self-only + nonces: no third-party origins. In
 * production `API_URL_EXTERNAL` is absent until openthrottle-server ships,
 * so the builder degrades to `connect-src 'self'` with no report directives;
 * preview/local (where the API URL exists) is the observation surface.
 */
export const getCspOptions = (): BuildCspOptions => ({
  additionalConnectSrc: [],
  additionalFontSrc: [],
  additionalImgSrc: [],
  additionalScriptSrc: [],
  apiUrl: ENV_SOURCE.API_URL_EXTERNAL,
  reportOnly: false,
});
