import type { OpenThrottleEnv } from '@openthrottle/react-router-utils';

const MASK = '•••••••• (redacted)';

/**
 * @description Masks high-entropy or secret-like env values for safe display and copy-to-clipboard.
 */
export const maskSensitiveEnvValue = (key: string, value: string): string => {
  const lower = key.toLowerCase();
  if (
    lower.includes('token') ||
    lower.includes('secret') ||
    lower.includes('password') ||
    lower.includes('api_key')
  ) {
    if (value.length <= 8) {
      return MASK;
    }
    return `${value.slice(0, 4)}…${value.slice(-4)} (masked)`;
  }
  if (key === 'ROLLBAR_TOKEN' && value.length > 0) {
    if (value.length <= 8) {
      return MASK;
    }
    return `${value.slice(0, 4)}…${value.slice(-4)} (masked)`;
  }
  return value;
};

/**
 * @description Produces a sorted key-value record safe for Settings diagnostics UI.
 */
export const sanitizeEnvForDiagnostics = (
  env: OpenThrottleEnv,
): Record<string, string> => {
  const entries = Object.entries(env).map(([key, value]) => [
    key,
    maskSensitiveEnvValue(key, String(value)),
  ]);
  entries.sort(([a], [b]) => a.localeCompare(b));
  return Object.fromEntries(entries);
};
