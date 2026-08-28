#!/usr/bin/env tsx

/**
 * Print copy-paste instructions for registering the OpenThrottle MCP server
 * GLOBALLY (user scope) in both Claude Code and Cursor.
 *
 * Run from anywhere in the checkout:
 *
 *     pnpm run setup:mcp-instructions
 *     # or directly:
 *     tsx scripts/setup_mcp-instructions.ts
 *
 * For each client we first check whether the `openthrottle-mcp` node is already
 * registered (Claude Code: `~/.claude.json` user scope; Cursor: `~/.cursor/mcp.json`).
 * If present, that client is reported as ✓ already installed instead of printing
 * its install block. We only look for OUR node — other MCP servers in those
 * files are outside our context and left untouched.
 *
 * It emits, per client that still needs setup:
 *   - Claude Code: a `claude mcp add-json ... --scope user` command.
 *   - Cursor: a `~/.cursor/mcp.json` JSON object.
 *
 * The launcher path is resolved to the absolute path of this checkout on the
 * current machine. Every `${...}` env placeholder is printed LITERALLY — those
 * are resolved at runtime by the MCP launcher/tooling, not by this script.
 *
 * Single source of truth: both blocks derive from the same `command`, `args`,
 * `description`, and env-key set below (`Record<EnvKey, string>` guarantees the
 * two clients cover exactly the same keys). Only the placeholder VALUES differ
 * per client, and those are preserved verbatim from the original instructions.
 *
 * Pure stdout, no side effects: it never edits ~/.cursor/mcp.json and never
 * runs the `claude mcp add-json` command itself.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import chalk from 'chalk';

import { SYMBOLS } from './lib/index.ts';

const SERVER_NAME = 'openthrottle-mcp';
const DESCRIPTION = `OpenThrottle (OT) plans knowledge base (Postgres + GraphQL). Plans, tasks, notes, commit links, activity, output stream, semantic search, health.`;

/**
 * Resolve the repo root absolutely. Prefer git; fall back to this file's own
 * location so it still works outside a git checkout.
 */
const resolveRoot = (): string => {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return resolve(dirname(fileURLToPath(import.meta.url)), '..');
  }
};

/**
 * Where each client stores its (user-scope) MCP registrations. We only ever
 * read these to look for OUR node — never write them.
 */
const clientConfigPaths = {
  claude: join(homedir(), '.claude.json'),
  cursor: join(homedir(), '.cursor', 'mcp.json'),
} as const;

/** The install state we resolve per client before rendering. */
interface InstallStatus {
  claude: boolean;
  cursor: boolean;
}

/**
 * Return true when `openthrottle-mcp` is already registered in the given client
 * config file. Any read/parse failure (missing file, malformed JSON) is treated
 * as "not installed" — the caller then prints the install block. Other MCP
 * servers in the file are ignored; we only test for our own node.
 */
const isServerInstalled = (configPath: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(readFileSync(configPath, 'utf8'));
    const servers =
      typeof parsed === 'object' && parsed !== null
        ? parsed.mcpServers
        : undefined;
    return Boolean(servers && SERVER_NAME in servers);
  } catch {
    return false;
  }
};

/** Resolve install state for every client from its on-disk config. */
const detectInstallStatus = (): InstallStatus => ({
  claude: isServerInstalled(clientConfigPaths.claude),
  cursor: isServerInstalled(clientConfigPaths.cursor),
});

/**
 * The env keys are identical across both clients; typing both records as
 * `Record<EnvKey, string>` makes it a compile error for the two blocks to drift
 * out of key-parity. The placeholder VALUES intentionally differ per client.
 */
type EnvKey =
  | 'ANTHROPIC_API_KEY'
  | 'API_URL'
  | 'API_URL_INTERNAL'
  | 'OPENTHROTTLE_MCP_AUTH_TOKEN';

const claudeEnv: Record<EnvKey, string> = {
  ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}',
  API_URL: '${OPENTHROTTLE_DEVELOPER_API_URL_EXTERNAL}',
  API_URL_INTERNAL: '${OPENTHROTTLE_DEVELOPER_API_URL_INTERNAL}',
  OPENTHROTTLE_MCP_AUTH_TOKEN: '${OPENTHROTTLE_MCP_AUTH_TOKEN}',
};

const cursorEnv: Record<EnvKey, string> = {
  ANTHROPIC_API_KEY: '${ANTHROPIC_API_KEY}',
  API_URL: '${API_URL}',
  API_URL_INTERNAL: '${API_URL_INTERNAL}',
  OPENTHROTTLE_MCP_AUTH_TOKEN: '${OPENTHROTTLE_MCP_AUTH_TOKEN}',
};

interface Payloads {
  /** The full `claude mcp add-json ... --scope user '<json>'` command line. */
  claudeCommand: string;
  /** The parsed object embedded in the Claude `add-json` command. */
  claudeConfig: {
    args: string[];
    command: string;
    description: string;
    env: Record<EnvKey, string>;
  };
  /** The parsed ~/.cursor/mcp.json object. */
  cursorConfig: {
    mcpServers: Record<
      string,
      { args: string[]; command: string; env: Record<EnvKey, string> }
    >;
  };
  /** The absolute launcher path both clients invoke. */
  launcher: string;
}

/**
 * Build the exact payloads both clients expect from the shared definition.
 * Kept separate from rendering so the payloads can be asserted on directly in
 * tests without parsing colorized output.
 */
const buildPayloads = (root: string): Payloads => {
  const launcher = `${root}/scripts/run-openthrottle-mcp.sh`;

  // Claude Code: a single-line JSON argument to `claude mcp add-json`.
  const claudeConfig = {
    args: [launcher],
    command: 'bash',
    description: DESCRIPTION,
    env: claudeEnv,
  };

  const claudeCommand = `claude mcp add-json ${SERVER_NAME} --scope user '${JSON.stringify(claudeConfig)}'`;

  // Cursor: the ~/.cursor/mcp.json object.
  const cursorConfig = {
    mcpServers: {
      [SERVER_NAME]: {
        args: [launcher],
        command: 'bash',
        env: cursorEnv,
      },
    },
  };

  return { claudeCommand, claudeConfig, cursorConfig, launcher };
};

/**
 * Render the human-facing, colorized instructions for a resolved repo root.
 * Each client whose config already contains the `openthrottle-mcp` node is
 * reported as complete; only clients that still need setup print their install
 * block. Pass `status` explicitly in tests; it defaults to on-disk detection.
 */
const renderInstructions = (
  root: string,
  status: InstallStatus = detectInstallStatus(),
): string => {
  const { launcher, claudeCommand, cursorConfig } = buildPayloads(root);
  const cursorJson = JSON.stringify(cursorConfig, null, 2);

  const rule = chalk.dim('─'.repeat(72));
  const fileCursor = chalk.blueBright.bold('~/.cursor/mcp.json');
  const mcpName = chalk.blueBright.bold('OpenThrottle MCP');

  const heading = (label: string): string => `${chalk.bold.red(`▶ ${label}`)}`;
  const done = (label: string): string =>
    `${chalk.bold.green(`${SYMBOLS.success} ${label}`)} ${chalk.dim('— already installed, nothing to do.')}`;

  const claudeBlock = status.claude
    ? [done('Claude Code')]
    : [
        heading('Claude Code'),
        chalk.dim(
          'Install it globally for all your Claude Code instances by running:',
        ),
        claudeCommand,
      ];

  const cursorBlock = status.cursor
    ? [done('Cursor')]
    : [
        heading('Cursor'),
        chalk.dim(
          `Install it globally across all Cursor instances by adding this to ${fileCursor}:`,
        ),
        cursorJson,
      ];

  const intro =
    status.claude && status.cursor
      ? chalk.dim(`The ${mcpName} is already set up in every client. 🎉`)
      : chalk.dim(
          `Installing the ${mcpName} globally looks a bit different in each client. Take a look at the instructions below for each client that still needs setup.`,
        );

  return [
    ``,
    intro,
    ...claudeBlock,
    ...cursorBlock,
    rule,
    chalk.dim(
      `Launcher resolved to: ${chalk.underline(launcher)} \nThe \${...} entries are placeholders resolved at launch by the MCP tooling — ${chalk.bold.inverse(' copy them verbatim ')}.`,
    ),
  ].join('\n\n');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.stdout.write(`${renderInstructions(resolveRoot())}\n`);
}

export {
  buildPayloads,
  clientConfigPaths,
  detectInstallStatus,
  isServerInstalled,
  renderInstructions,
};
export type { EnvKey, InstallStatus, Payloads };
