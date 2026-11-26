/**
 * The doctor's `--fix`, in two sections.
 *
 * - Plan: {@link planPluginFix}, {@link parseMarketplaceKnown} and {@link formatPluginFixCommand}
 *   decide which `claude plugin …` commands would bring the marketplace plugin up to date, from
 *   facts already gathered. No filesystem, process or prompt.
 * - Run: {@link resolvePluginFixPlan}, {@link createTerminalFixIo} and {@link runPluginFix} gather
 *   the facts, ask for consent and run the commands.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

import { isRecord } from '@openthrottle/nodejs-utils';

import type { MarketplaceInstall } from '../data/heartbeat.ts';
import { resolvePayloadVersion } from './claude-doctor.ts';
import { isOlderVersion, PLUGIN_ID } from './claude-doctor-checks.ts';
import {
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from './claude-heartbeat.ts';

// ── Plan ──
// Pure half of the doctor's `--fix`: decide which `claude plugin …` commands would bring the
// marketplace plugin up to date, from facts already gathered. No filesystem, process or prompt.

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

// ── Run ──
// Impure half of the doctor's `--fix`: read the plugin registries, show the exact `claude plugin …`
// commands, and run them only after an interactive yes. It changes the user's global Claude Code
// setup, so it never runs without a terminal to ask on and never runs on silence — the default
// answer is no.

const CLAUDE_BIN_ENV = 'OPENTHROTTLE_CLAUDE_BIN';

/**
 * How `--fix` ended. `no-tty` and `failed` are the two the CLI reports with a non-zero exit.
 *
 * @public
 */
export const PLUGIN_FIX_OUTCOME = {
  APPLIED: 'applied',
  DECLINED: 'declined',
  FAILED: 'failed',
  NOTHING_TO_FIX: 'nothing-to-fix',
  NO_TTY: 'no-tty',
} as const;

export type PluginFixOutcomeKey = keyof typeof PLUGIN_FIX_OUTCOME;
/** @public */
export type PluginFixOutcomeValue =
  (typeof PLUGIN_FIX_OUTCOME)[PluginFixOutcomeKey];

/**
 * Everything `--fix` touches outside its own logic, so tests can drive it without a terminal.
 *
 * @public
 */
export interface PluginFixIo {
  readonly ask: (question: string) => Promise<string>;
  readonly isInteractive: boolean;
  /** Run `binary args…` with inherited stdio; resolves to its exit status. */
  readonly run: (binary: string, args: readonly string[]) => number;
  readonly write: (text: string) => void;
}

const readTextOrNull = (filePath: string): string | null => {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
};

/**
 * The `claude` binary to run: `OPENTHROTTLE_CLAUDE_BIN` when set, else `claude` on PATH.
 *
 * @public
 */
export const resolveClaudeBinary = (env: NodeJS.ProcessEnv): string => {
  const override = env[CLAUDE_BIN_ENV]?.trim();
  return override !== undefined && override !== '' ? override : 'claude';
};

/**
 * Read both plugin registries under the Claude config dir and plan the fix.
 *
 * @public
 */
export const resolvePluginFixPlan = ({
  env,
  homeDir,
  scriptPath,
}: {
  readonly env: NodeJS.ProcessEnv;
  readonly homeDir: string;
  readonly scriptPath: string;
}): PluginFixPlan => {
  const pluginsDir = path.join(resolveClaudeConfigDir(env, homeDir), 'plugins');
  return planPluginFix({
    install: parseMarketplaceInstall(
      readTextOrNull(path.join(pluginsDir, 'installed_plugins.json')),
    ),
    marketplaceKnown: parseMarketplaceKnown(
      readTextOrNull(path.join(pluginsDir, 'known_marketplaces.json')),
    ),
    payloadVersion: resolvePayloadVersion(scriptPath),
  });
};

/**
 * Run a command with inherited stdio, so the CLI's own output and prompts reach the user.
 *
 * @public
 */
export const spawnInherited = (
  binary: string,
  args: readonly string[],
): number => {
  const result = spawnSync(binary, [...args], { stdio: 'inherit' });
  return result.status ?? 1;
};

/**
 * The real terminal: consent needs both stdin and stdout to be a TTY.
 *
 * @public
 */
export const createTerminalFixIo = (): PluginFixIo => {
  return {
    ask: async (question) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      try {
        return await rl.question(question);
      } finally {
        rl.close();
      }
    },
    isInteractive:
      process.stdin.isTTY === true && process.stdout.isTTY === true,
    run: spawnInherited,
    write: (text) => {
      process.stdout.write(text);
    },
  };
};

const isYes = (answer: string): boolean => {
  const normalized = answer.trim().toLowerCase();
  return normalized === 'y' || normalized === 'yes';
};

/**
 * Show the plan, ask y/N, and run each command in order, stopping at the first non-zero exit.
 *
 * @public
 */
export const runPluginFix = async ({
  binary,
  io,
  plan,
}: {
  readonly binary: string;
  readonly io: PluginFixIo;
  readonly plan: PluginFixPlan;
}): Promise<PluginFixOutcomeValue> => {
  if (plan.kind === 'none') {
    io.write('\n--fix: the plugin is installed and current; nothing to run.\n');
    return PLUGIN_FIX_OUTCOME.NOTHING_TO_FIX;
  }
  const shown = plan.commands.map(
    (command) => `    ${formatPluginFixCommand(binary, command)}`,
  );
  io.write(
    `\n--fix will ${plan.kind} the openthrottle plugin in your Claude Code setup:\n${shown.join('\n')}\n`,
  );
  if (!io.isInteractive) {
    io.write(
      '--fix needs an interactive terminal to ask first; run the commands above yourself.\n',
    );
    return PLUGIN_FIX_OUTCOME.NO_TTY;
  }
  if (!isYes(await io.ask('Run these now? [y/N] '))) {
    io.write('Nothing was changed.\n');
    return PLUGIN_FIX_OUTCOME.DECLINED;
  }
  for (const command of plan.commands) {
    const status = io.run(binary, command);
    if (status !== 0) {
      io.write(
        `\`${formatPluginFixCommand(binary, command)}\` exited ${status}; stopped.\n`,
      );
      return PLUGIN_FIX_OUTCOME.FAILED;
    }
  }
  io.write('Done. Restart Claude Code to load the plugin.\n');
  return PLUGIN_FIX_OUTCOME.APPLIED;
};
