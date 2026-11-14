/**
 * Pure half of the doctor's `--fix`: decide which `claude plugin …` commands would bring the
 * marketplace plugin up to date, from facts already gathered. No filesystem, process or prompt —
 * `doctor-fix-run.ts` gathers the facts, asks for consent and runs the commands.
 */
import { isRecord } from '@openthrottle/nodejs-utils';

import { isOlderVersion, PLUGIN_ID } from './doctor-checks.ts';
import type { MarketplaceInstall } from './heartbeat-payload.ts';

/** The marketplace's name, as recorded in `known_marketplaces.json`. */
const MARKETPLACE_NAME = 'openthrottle';

/** Where the marketplace is added from. */
const MARKETPLACE_SOURCE = 'OpenThrottle/monorepo';

/**
 * One `claude` invocation, as argv without the binary.
 *
 * @public
 */
export type PluginFixCommand = readonly string[];

/**
 * Nothing to run: the plugin is installed and current, or its version cannot be compared.
 *
 * @public
 */
export interface PluginFixNone {
  readonly kind: 'none';
}

/**
 * Commands that install or update the plugin, run in order, stopping at the first failure.
 *
 * @public
 */
export interface PluginFixRun {
  readonly commands: readonly PluginFixCommand[];
  readonly kind: 'install' | 'update';
}

/** @public */
export type PluginFixPlan = PluginFixNone | PluginFixRun;

/**
 * Whether `known_marketplaces.json`'s text already lists the OpenThrottle marketplace. Unreadable
 * or unrecognized text counts as not known, so the worst case is a redundant `marketplace add`.
 *
 * @public
 */
export const parseMarketplaceKnown = (rawJson: string | null): boolean => {
  if (rawJson === null) {
    return false;
  }
  try {
    const parsed: unknown = JSON.parse(rawJson);
    return isRecord(parsed) && isRecord(parsed[MARKETPLACE_NAME]);
  } catch {
    return false;
  }
};

/**
 * The commands that fix the `plugin` check, mirroring its verdicts: not installed (or an
 * unreadable registry) installs, adding the marketplace first unless it is already known; an
 * installed version older than the payload's updates; anything else needs nothing.
 *
 * @public
 */
export const planPluginFix = ({
  install,
  marketplaceKnown,
  payloadVersion,
}: {
  readonly install: MarketplaceInstall;
  readonly marketplaceKnown: boolean;
  readonly payloadVersion: string | null;
}): PluginFixPlan => {
  if (install.installed !== true) {
    const addMarketplace: readonly PluginFixCommand[] = marketplaceKnown
      ? []
      : [['plugin', 'marketplace', 'add', MARKETPLACE_SOURCE]];
    return {
      commands: [...addMarketplace, ['plugin', 'install', PLUGIN_ID]],
      kind: 'install',
    };
  }
  if (
    install.version !== null &&
    payloadVersion !== null &&
    isOlderVersion(install.version, payloadVersion)
  ) {
    return { commands: [['plugin', 'update', PLUGIN_ID]], kind: 'update' };
  }
  return { kind: 'none' };
};

/**
 * A command as shown to the user before they consent to it.
 *
 * @public
 */
export const formatPluginFixCommand = (
  binary: string,
  command: PluginFixCommand,
): string => {
  const shownBinary = /\s/.test(binary) ? `"${binary}"` : binary;
  return [shownBinary, ...command].join(' ');
};
