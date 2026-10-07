#!/usr/bin/env node

/**
 * @description Warn when the user-global Claude Code settings do not load this
 * repo's AGENTS.md files. Claude Code only reads an AGENTS.md alongside a
 * CLAUDE.md when `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`)
 * sets `pluginConfigs["agents-md@builtin"].options.instructionFiles` to
 * `"claude-md-and-agents-md"`; without it the repo's AGENTS.md files are
 * silently ignored. This check READS that file and prints a remediation
 * snippet — it never writes to it. Exits 0 by default (warn-only); `--strict`
 * exits 1 on any non-ok outcome. The pure core is exported for tests and for
 * `setup.ts`, which runs the same check from its outro. Node builtins and
 * `scripts/lib` only, so it is safe to run before dependencies are installed.
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Logger } from './utils/index.ts';
import { createLogger, hasFlag } from './utils/index.ts';

/** The `instructionFiles` value that makes Claude Code load AGENTS.md files. */
export const REQUIRED_INSTRUCTION_FILES = 'claude-md-and-agents-md';

/** The built-in plugin whose options control AGENTS.md loading. */
export const AGENTS_MD_PLUGIN_KEY = 'agents-md@builtin';

/** The option on {@link AGENTS_MD_PLUGIN_KEY} that selects instruction files. */
const INSTRUCTION_FILES_OPTION = 'instructionFiles';

const SETTINGS_FILENAME = 'settings.json';

/** What the settings file says about AGENTS.md loading. */
export type AgentsMdOutcome =
  | { readonly kind: 'invalid-json'; readonly message: string }
  | { readonly kind: 'missing-file' }
  | { readonly kind: 'ok' }
  | { readonly kind: 'unreadable'; readonly message: string }
  | { readonly kind: 'unset' }
  | { readonly kind: 'wrong-shape'; readonly message: string }
  | { readonly kind: 'wrong-value'; readonly value: string };

/** The result of trying to read the settings file; never a throw. */
export type SettingsReadResult =
  | { readonly contents: string; readonly kind: 'contents' }
  | { readonly kind: 'missing-file' }
  | { readonly kind: 'unreadable'; readonly message: string };

/** The outcome plus the settings path it was evaluated from. */
export interface ClaudeGlobalSettingsCheck {
  readonly outcome: AgentsMdOutcome;
  readonly settingsPath: string;
}

export interface ClaudeGlobalSettingsCheckOptions {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly homedir: string;
  readonly logger: Logger;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const describeJsonType = (value: unknown): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';

  return `a ${typeof value}`;
};

/**
 * `$CLAUDE_CONFIG_DIR/settings.json` when the env var is set and non-empty,
 * else `<home>/.claude/settings.json`.
 */
export function resolveClaudeSettingsPath(
  env: Readonly<Record<string, string | undefined>>,
  home: string,
): string {
  const configDir = env.CLAUDE_CONFIG_DIR;

  if (configDir !== undefined && configDir.trim() !== '') {
    return join(configDir, SETTINGS_FILENAME);
  }

  return join(home, '.claude', SETTINGS_FILENAME);
}

/**
 * Classify the raw contents of the settings file. `undefined` means the file
 * does not exist. Never throws: malformed JSON and wrong-typed shapes become
 * outcomes.
 */
export function evaluateAgentsMdSetting(
  raw: string | undefined,
): AgentsMdOutcome {
  if (raw === undefined) {
    return { kind: 'missing-file' };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return {
      kind: 'invalid-json',
      message: error instanceof Error ? error.message : String(error),
    };
  }

  if (!isRecord(parsed)) {
    return {
      kind: 'wrong-shape',
      message: `settings root is ${describeJsonType(parsed)}, expected an object`,
    };
  }

  const pluginConfigs = parsed.pluginConfigs;

  if (pluginConfigs === undefined) {
    return { kind: 'unset' };
  }

  if (!isRecord(pluginConfigs)) {
    return {
      kind: 'wrong-shape',
      message: `pluginConfigs is ${describeJsonType(pluginConfigs)}, expected an object`,
    };
  }

  const plugin = pluginConfigs[AGENTS_MD_PLUGIN_KEY];

  if (plugin === undefined) {
    return { kind: 'unset' };
  }

  if (!isRecord(plugin)) {
    return {
      kind: 'wrong-shape',
      message: `pluginConfigs["${AGENTS_MD_PLUGIN_KEY}"] is ${describeJsonType(plugin)}, expected an object`,
    };
  }

  const options = plugin.options;

  if (options === undefined) {
    return { kind: 'unset' };
  }

  if (!isRecord(options)) {
    return {
      kind: 'wrong-shape',
      message: `pluginConfigs["${AGENTS_MD_PLUGIN_KEY}"].options is ${describeJsonType(options)}, expected an object`,
    };
  }

  const value = options[INSTRUCTION_FILES_OPTION];

  if (value === undefined) {
    return { kind: 'unset' };
  }

  if (value === REQUIRED_INSTRUCTION_FILES) {
    return { kind: 'ok' };
  }

  return { kind: 'wrong-value', value: JSON.stringify(value) };
}

/**
 * Read the settings file, classifying failures instead of throwing: ENOENT and
 * ENOTDIR mean "missing"; anything else (EACCES, EISDIR, ...) is "unreadable".
 */
export function readClaudeSettingsFile(path: string): SettingsReadResult {
  try {
    return { contents: readFileSync(path, 'utf8'), kind: 'contents' };
  } catch (error) {
    const code =
      isRecord(error) && typeof error.code === 'string'
        ? error.code
        : undefined;

    if (code === 'ENOENT' || code === 'ENOTDIR') {
      return { kind: 'missing-file' };
    }

    return {
      kind: 'unreadable',
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/** The `pluginConfigs` JSON block to merge into the user-global settings. */
export function remediationSnippet(): string {
  return JSON.stringify(
    {
      pluginConfigs: {
        [AGENTS_MD_PLUGIN_KEY]: {
          options: {
            [INSTRUCTION_FILES_OPTION]: REQUIRED_INSTRUCTION_FILES,
          },
        },
      },
    },
    null,
    2,
  );
}

/** A one-line human description of a non-ok outcome. */
export function describeOutcome(outcome: AgentsMdOutcome): string {
  switch (outcome.kind) {
    case 'invalid-json':
      return `the file is not valid JSON (${outcome.message})`;
    case 'missing-file':
      return 'the file does not exist';
    case 'ok':
      return `${AGENTS_MD_PLUGIN_KEY} is set to "${REQUIRED_INSTRUCTION_FILES}"`;
    case 'unreadable':
      return `the file could not be read (${outcome.message})`;
    case 'unset':
      return `pluginConfigs["${AGENTS_MD_PLUGIN_KEY}"].options.${INSTRUCTION_FILES_OPTION} is not set`;
    case 'wrong-shape':
      return `unexpected settings shape: ${outcome.message}`;
    case 'wrong-value':
      return `${INSTRUCTION_FILES_OPTION} is ${outcome.value}, expected "${REQUIRED_INSTRUCTION_FILES}"`;
  }
}

/**
 * Resolve, read, evaluate and report. Shared by `main()` and `setup.ts` so
 * there is one code path. Logs a success line on ok, otherwise a warning block
 * with the remediation. Never writes to the settings file and never throws.
 */
export function runClaudeGlobalSettingsCheck(
  options: ClaudeGlobalSettingsCheckOptions,
): ClaudeGlobalSettingsCheck {
  const { env, logger } = options;
  const settingsPath = resolveClaudeSettingsPath(env, options.homedir);
  const read = readClaudeSettingsFile(settingsPath);
  const outcome: AgentsMdOutcome =
    read.kind === 'contents'
      ? evaluateAgentsMdSetting(read.contents)
      : read.kind === 'missing-file'
        ? { kind: 'missing-file' }
        : { kind: 'unreadable', message: read.message };

  if (outcome.kind === 'ok') {
    logger.success(
      `${settingsPath}: Claude Code loads AGENTS.md files alongside CLAUDE.md.`,
    );

    return { outcome, settingsPath };
  }

  logger.blank();
  logger.warn(
    "Claude Code will silently IGNORE this repo's AGENTS.md files until your user-global settings enable them.",
  );
  logger.detail(`Settings file: ${settingsPath}`);
  logger.detail(`Problem: ${describeOutcome(outcome)}`);
  logger.detail(
    'Why it matters: Claude Code only loads AGENTS.md next to CLAUDE.md when this option is set; the folder-level guidance in AGENTS.md never reaches the agent otherwise.',
  );
  logger.detail(
    'Fix: merge this block into that file yourself (this script never edits it):',
  );

  for (const line of remediationSnippet().split('\n')) {
    logger.detail(`  ${line}`);
  }

  logger.blank();

  return { outcome, settingsPath };
}

function main(): void {
  const { outcome } = runClaudeGlobalSettingsCheck({
    env: process.env,
    homedir: homedir(),
    logger: createLogger(),
  });

  if (outcome.kind !== 'ok' && hasFlag('strict')) {
    process.exit(1);
  }
}

// Only run when invoked directly (not when imported by tests or setup).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
