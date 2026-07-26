/**
 * @description Assembles the concrete driver registry and exposes `getDriver`. Each driver module
 * is added to `ALL_DRIVERS`; the map is derived from it so ids and drivers cannot drift. Kept
 * separate from `../registry` to avoid an import cycle (driver modules import `defineDriver`).
 */

import { lookupDriver } from '../registry/index.ts';
import type { DriverId, DriverRegistry } from '../registry/index.ts';
import type { AgentDriver } from '../types/index.ts';

/**
 * @description Every registered driver, in id order. Extend as driver modules land (tasks 5-7).
 * @public
 */
export const ALL_DRIVERS: readonly AgentDriver[] = [];

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
