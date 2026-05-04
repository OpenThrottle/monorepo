import { getEnvironment } from '@openthrottle/react-router-utils';
import { sanitizeEnvForDiagnostics } from './sanitize-client-env';

export interface SettingsDiagnosticsLoaderData {
  readonly env: OpenThrottleEnv;
  readonly supportBundle: Record<string, string>;
}

/**
 * @description Shared loader payload for Settings general/appearance diagnostics (build info + URL matrix).
 */
export const getSettingsDiagnosticsLoaderData =
  (): SettingsDiagnosticsLoaderData => {
    const env = getEnvironment();
    return {
      env,
      supportBundle: sanitizeEnvForDiagnostics(env),
    };
  };
