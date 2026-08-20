/**
 * @description Public API for `@openthrottle/openthrottle-drivers` — the OT-central contract for
 * invoking agent CLIs. Consumers use `getDriver` / `parseDriverId` to resolve a driver and the
 * execution engine (`runDriverSync` / `runDriverAsync`) to run one invocation.
 */

export * from './drivers/index.ts';
export * from './engine/index.ts';
export * from './errors/index.ts';
export * from './registry/index.ts';
export * from './run-agent-prompt/index.ts';
export * from './types/index.ts';
export * from './utils/child-kill.ts';
export * from './utils/logger.ts';
export * from './utils/mcp.ts';
export * from './utils/plugin-dir.ts';
export * from './utils/shell.ts';
