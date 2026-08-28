/**
 * @description Driver id set and registry primitives: the canonical `DRIVERS` object,
 * `defineDriver` identity helper, id guards/parsers, and the pure `lookupDriver` resolver. This
 * module intentionally does NOT import the concrete driver modules so it stays free of cycles
 * (drivers import `defineDriver` from here; the assembled registry lives in `../drivers`).
 */

import { UnknownDriverError } from '../errors/index.ts';
import type { AgentDriver } from '../types/index.ts';

/**
 * @description The agent-CLI driver ids — the only place these strings are listed.
 * Downstream maps are `Record<DriverId, …>` so adding an id fails typecheck until every
 * shape has a matching key.
 * @public
 */
export const DRIVERS = {
  antigravity: 'antigravity',
  claude: 'claude',
  codex: 'codex',
  cursor: 'cursor',
  gemini: 'gemini',
  grok: 'grok',
  opencode: 'opencode',
} as const;

/**
 * @description A supported agent-CLI driver id.
 * @public
 */
export type DriverId = (typeof DRIVERS)[keyof typeof DRIVERS];

/**
 * @description Canonical set of agent-CLI driver ids, in declaration order.
 * @public
 */
export const DRIVER_IDS: readonly DriverId[] = Object.values(DRIVERS);

const DRIVER_ID_SET: ReadonlySet<string> = new Set(DRIVER_IDS);

/**
 * @description Default driver when none is specified (matches the legacy `DEFAULT_WORKFLOW_RUNNER`).
 * @public
 */
export const DEFAULT_DRIVER_ID: DriverId = 'cursor';

/**
 * @description Identity helper that gives a driver literal its `AgentDriver` type while keeping the
 * concrete `id`/`label` narrow at the call site. Every driver module is one `defineDriver(...)` call.
 * @public
 */
export const defineDriver = (driver: AgentDriver): AgentDriver => driver;

/**
 * @description Registry map from driver id to driver.
 *
 * Stays `Partial` deliberately, and it is **not** the completeness gate. This module must not
 * import the concrete driver modules (they import `defineDriver` from here, so doing so would
 * close an import cycle), which means a full `Record` declared here could never be satisfied
 * here. `Partial` also keeps {@link lookupDriver} usable with the trimmed registries the tests
 * build. Completeness is enforced one layer up, where the imports are legal: `DRIVER_REGISTRY`
 * in `../drivers` is `Record<DriverId, AgentDriver>`.
 * @public
 */
export type DriverRegistry = Partial<Record<DriverId, AgentDriver>>;

/**
 * @description True when `value` is a supported {@link DriverId}.
 * @public
 */
export const isDriverId = (value: string): value is DriverId =>
  DRIVER_ID_SET.has(value);

/**
 * @description Normalizes (trim + lowercase) and validates a driver id from CLI, env, or defaults
 * file. Throws {@link UnknownDriverError} on empty/unknown input. Message wording matches the legacy
 * `parseWorkflowRunnerId` so re-exports stay compatible.
 * @public
 */
export const parseDriverId = (
  raw: string,
  source: 'cli' | 'env' | 'file' = 'cli',
): DriverId => {
  const normalized = raw.trim().toLowerCase();

  if (normalized === '') {
    throw new UnknownDriverError(
      `Execution backend (${source}) must be a non-empty string (e.g. ${DEFAULT_DRIVER_ID})`,
      raw,
    );
  }

  if (!isDriverId(normalized)) {
    throw new UnknownDriverError(
      `Unknown execution backend "${raw.trim()}". Supported: ${DRIVER_IDS.join(', ')}`,
      raw,
    );
  }

  return normalized;
};

/**
 * @description Pure resolver: returns the driver registered for `id` in `registry`, or throws
 * {@link UnknownDriverError} when none is registered. `getDriver` (in `../drivers`) binds this to
 * the assembled registry.
 * @public
 */
export const lookupDriver = (
  registry: DriverRegistry,
  id: DriverId,
): AgentDriver => {
  const driver = registry[id];

  if (driver === undefined) {
    const registered = Object.keys(registry).join(', ') || '(none)';
    throw new UnknownDriverError(
      `No driver registered for id "${id}". Registered: ${registered}`,
      id,
    );
  }

  return driver;
};
