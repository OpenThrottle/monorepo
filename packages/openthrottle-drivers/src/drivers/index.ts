/**
 * @description Assembles the concrete driver registry and exposes `getDriver`. Each driver module
 * is registered in `DRIVER_REGISTRY`, a `Record<DriverId, AgentDriver>`, and `ALL_DRIVERS` is
 * derived from it — so ids and drivers cannot drift. Kept separate from `../registry` to avoid
 * an import cycle (driver modules import `defineDriver`), which is also why the gate lives here.
 */

import { DRIVER_IDS, lookupDriver } from '../registry/index.ts';
import type { DriverId } from '../registry/index.ts';
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
 * @description Registry map from driver id to driver.
 *
 * This is the completeness gate for {@link DriverId}, and the reason it lives here rather
 * than in `../registry`: this module may import the concrete driver modules, that one may not
 * (they import `defineDriver` from it, so importing them back would close a cycle). Adding an
 * id to `DRIVERS` fails to compile here until a driver module is registered for it.
 * @public
 */
export const DRIVER_REGISTRY: Record<DriverId, AgentDriver> = {
  antigravity: antigravityDriver,
  claude: claudeDriver,
  codex: codexDriver,
  cursor: cursorDriver,
  gemini: geminiDriver,
  grok: grokDriver,
  opencode: opencodeDriver,
};

/**
 * @description Every registered driver, in `DRIVER_IDS` order. Derived from
 * {@link DRIVER_REGISTRY} so the list and the map cannot drift.
 * @public
 */
export const ALL_DRIVERS: readonly AgentDriver[] = DRIVER_IDS.map(
  (id): AgentDriver => DRIVER_REGISTRY[id],
);

/**
 * @description Resolves the driver registered for `id`, or throws `UnknownDriverError`.
 * @public
 */
export const getDriver = (id: DriverId): AgentDriver =>
  lookupDriver(DRIVER_REGISTRY, id);
