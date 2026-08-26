/**
 * @description Assembles the concrete driver registry and exposes `getDriver`. Each driver module
 * is added to `ALL_DRIVERS`; the map is derived from it so ids and drivers cannot drift. Kept
 * separate from `../registry` to avoid an import cycle (driver modules import `defineDriver`).
 */

import { lookupDriver } from '../registry/index.ts';
import type { DriverId, DriverRegistry } from '../registry/index.ts';
import type { AgentDriver } from '../types/index.ts';
import { antigravityDriver } from './antigravity.ts';
import { claudeDriver } from './claude.ts';
import { codexDriver } from './codex.ts';
import { cursorDriver } from './cursor.ts';
import { geminiDriver } from './gemini.ts';
import { grokDriver } from './grok.ts';
import { opencodeDriver } from './opencode.ts';

export { antigravityDriver } from './antigravity.ts';
export { claudeDriver } from './claude.ts';
export { codexDriver } from './codex.ts';
export { cursorDriver } from './cursor.ts';
export { geminiDriver } from './gemini.ts';
export { grokDriver } from './grok.ts';
export { opencodeDriver } from './opencode.ts';

/**
 * @description Every registered driver, in `DRIVER_IDS` order. One entry per `defineDriver` module.
 * @public
 */
export const ALL_DRIVERS: readonly AgentDriver[] = [
  antigravityDriver,
  claudeDriver,
  codexDriver,
  cursorDriver,
  geminiDriver,
  grokDriver,
  opencodeDriver,
];

/**
 * @description Registry map assembled from {@link ALL_DRIVERS}.
 * @public
 */
export const DRIVER_REGISTRY: DriverRegistry = Object.fromEntries(
  ALL_DRIVERS.map((driver): [string, AgentDriver] => [driver.id, driver]),
);

/**
 * @description Resolves the driver registered for `id`, or throws `UnknownDriverError`.
 * @public
 */
export const getDriver = (id: DriverId): AgentDriver =>
  lookupDriver(DRIVER_REGISTRY, id);
