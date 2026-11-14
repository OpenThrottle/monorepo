/**
 * Impure half of the doctor's `--fix`: read the plugin registries, show the exact `claude plugin …`
 * commands, and run them only after an interactive yes. It changes the user's global Claude Code
 * setup, so it never runs without a terminal to ask on and never runs on silence — the default
 * answer is no.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';

import {
  formatPluginFixCommand,
  parseMarketplaceKnown,
  planPluginFix,
  type PluginFixPlan,
} from './doctor-fix.ts';
import { resolvePayloadVersion } from './doctor-run.ts';
import {
  parseMarketplaceInstall,
  resolveClaudeConfigDir,
} from './heartbeat-payload.ts';

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

/** @public */
export type PluginFixOutcome =
  (typeof PLUGIN_FIX_OUTCOME)[keyof typeof PLUGIN_FIX_OUTCOME];

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
}): Promise<PluginFixOutcome> => {
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
