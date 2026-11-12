/**
 * The scrubbed child environment for agy, shared by the headless `-p` adapter
 * and the ACP spec (`agy acp`). Kept in its own module so the ACP spec does not
 * pull the whole stream-json adapter into everything that imports the specs
 * (the hook bundles among them).
 */

/** Env vars the child is allowed to inherit (host Google auth + locale), nothing else. */
const ALLOWED_ENV_KEYS = [
  'AGY_ADC_AUTH',
  'GEMINI_API_KEY',
  'GOOGLE_API_KEY',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'GOOGLE_CLOUD_LOCATION',
  'GOOGLE_CLOUD_PROJECT',
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/**
 * Build a minimal allowlisted environment for the spawned child. `extra` (the run's `mcpEnv`) is
 * merged on top: the host env stays allowlisted, and only the explicit server-provided keys are
 * admitted. Shared with the ACP spec, which launches the same binary as `agy acp`.
 */
export function buildAntigravityEnv(
  env: NodeJS.ProcessEnv = process.env,
  extra?: Readonly<Record<string, string>>,
): NodeJS.ProcessEnv {
  const scrubbed: NodeJS.ProcessEnv = {};
  for (const key of ALLOWED_ENV_KEYS) {
    const value = env[key];
    if (value !== undefined) {
      scrubbed[key] = value;
    }
  }
  if (extra !== undefined) {
    for (const [key, value] of Object.entries(extra)) {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}
