/**
 * @description The allowlisted environment every headless agent CLI child gets. A child no longer
 * inherits the server's `process.env`: it receives only {@link BASE_CHILD_ENV_KEYS}, its driver's
 * declared host-login keys ({@link DriverHostEnv}), the install's named passthrough list
 * ({@link AGENT_ENV_PASSTHROUGH_ENV}) and the run's explicit extras. Anything else — database
 * passwords, JWT secrets, cloud and provider keys — is dropped, and only its NAME is reported.
 *
 * Webhook-triggered jobs feed attacker-authored text into these runs, so an inherited secret is
 * one prompt injection away from leaving the host (docs/openthrottle/webhook-triggered-agent-jobs.md T4).
 */

/**
 * @description Host keys every child gets regardless of driver: the login identity, shell and
 * locale a CLI needs to find its own config and run tools. `USER` is load-bearing on macOS — the
 * Claude CLI cannot find a Keychain login without it.
 * @public
 */
export const BASE_CHILD_ENV_KEYS = [
  'HOME',
  'LANG',
  'LC_ALL',
  'LOGNAME',
  'PATH',
  'SHELL',
  'TERM',
  'TMPDIR',
  'USER',
] as const;

/**
 * @description Per-install passthrough: a comma- or whitespace-separated list of EXACT variable
 * names (e.g. `GH_TOKEN,NX_DAEMON,HTTPS_PROXY`) admitted into every agent child on top of the
 * allowlist. Wildcards and malformed names are refused, never expanded.
 * @public
 */
export const AGENT_ENV_PASSTHROUGH_ENV = 'OPENTHROTTLE_AGENT_ENV_PASSTHROUGH';

/**
 * @description The host-login variables one CLI needs from the host: exact `keys`, plus `prefixes`
 * passed through wholesale for a CLI whose own namespace is configuration by construction
 * (cursor's `CURSOR_*`). Never put a prefix here that server state could share.
 * @public
 */
export interface DriverHostEnv {
  readonly keys: readonly string[];
  readonly prefixes: readonly string[];
}

/**
 * @description The parsed {@link AGENT_ENV_PASSTHROUGH_ENV} value: admitted names and refused entries.
 * @public
 */
export interface AgentEnvPassthrough {
  readonly names: readonly string[];
  readonly refused: readonly string[];
}

/**
 * @description Input for {@link buildAllowlistedChildEnv}.
 * @public
 */
export interface BuildChildEnvInput {
  /** The run's explicit variables (run identity, MCP env, ...), admitted as given. */
  readonly extras: Readonly<Record<string, string>> | undefined;
  /** The parent environment the allowlist reads from (normally `process.env`). */
  readonly hostEnv: Readonly<Record<string, string | undefined>>;
  readonly hostEnvPolicy: DriverHostEnv;
}

/**
 * @description The built child env, plus the names (never values) of what was left behind.
 * @public
 */
export interface ChildEnvResult {
  /** Host variable names that were set but not admitted, sorted. */
  readonly dropped: readonly string[];
  readonly env: Record<string, string>;
  /** {@link AGENT_ENV_PASSTHROUGH_ENV} entries refused as wildcards or malformed names. */
  readonly refusedPassthrough: readonly string[];
}

const ENV_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

/**
 * @description Parses {@link AGENT_ENV_PASSTHROUGH_ENV}. Entries split on commas and whitespace;
 * an entry that is not a plain variable name (`NX_*`, `*`, `A-B`) is refused, so a wildcard can
 * never widen the child env.
 * @public
 */
export const parseAgentEnvPassthrough = (
  raw: string | undefined,
): AgentEnvPassthrough => {
  const entries = (raw ?? '')
    .split(/[\s,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');

  return {
    names: entries.filter((entry) => ENV_NAME_PATTERN.test(entry)),
    refused: entries.filter((entry) => !ENV_NAME_PATTERN.test(entry)),
  };
};

/**
 * @description Builds the child env from the allowlist alone. Host values come from base keys,
 * the driver's {@link DriverHostEnv} and the passthrough list; `extras` are layered over them.
 * @public
 */
export const buildAllowlistedChildEnv = (
  input: BuildChildEnvInput,
): ChildEnvResult => {
  const { extras, hostEnv, hostEnvPolicy } = input;
  const passthrough = parseAgentEnvPassthrough(
    hostEnv[AGENT_ENV_PASSTHROUGH_ENV],
  );
  const allowedKeys = new Set<string>([
    ...BASE_CHILD_ENV_KEYS,
    ...hostEnvPolicy.keys,
    ...passthrough.names,
  ]);

  const isAllowed = (key: string): boolean => {
    return (
      allowedKeys.has(key) ||
      hostEnvPolicy.prefixes.some((prefix) => key.startsWith(prefix))
    );
  };

  const env: Record<string, string> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(hostEnv)) {
    if (value === undefined) {
      continue;
    }

    if (isAllowed(key)) {
      env[key] = value;
    } else if (extras?.[key] === undefined) {
      dropped.push(key);
    }
  }

  return {
    dropped: dropped.sort(),
    env: { ...env, ...extras },
    refusedPassthrough: passthrough.refused,
  };
};
