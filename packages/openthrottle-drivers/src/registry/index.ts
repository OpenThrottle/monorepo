/**
 * @description Driver id vocabulary and registry primitives: the canonical `DRIVER_IDS` set,
 * `defineDriver` identity helper, id guards/parsers, and the pure `lookupDriver` resolver. This
 * module intentionally does NOT import the concrete driver modules so it stays free of cycles
 * (drivers import `defineDriver` from here; the assembled registry lives in `../drivers`).
 */

import { UnknownDriverError } from '../errors/index.ts';
import type { AgentDriver } from '../types/index.ts';

/**
 * @description Canonical set of agent-CLI driver ids. Extend when adding a driver module.
 * @public
 */
export const DRIVER_IDS = [
  'claude',
  'codex',
  'cursor',
  'grok',
  'opencode',
] as const;

/**
 * @description A supported agent-CLI driver id.
 * @public
 */
export type DriverId = (typeof DRIVER_IDS)[number];

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
 * @description Registry map from driver id to driver. Partial because it is assembled incrementally
 * as driver modules are registered.
 * @public
 */
export type DriverRegistry = Partial<Record<DriverId, AgentDriver>>;

/**
 * @description True when `value` is a supported {@link DriverId}.
 * @public
 */
export const isDriverId = (value: string): value is DriverId => {
  return DRIVER_IDS.some((id) => id === value);
};

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
