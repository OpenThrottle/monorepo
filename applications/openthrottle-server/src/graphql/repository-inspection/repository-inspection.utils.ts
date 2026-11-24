import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

import { toContainerPath } from '@openthrottle/openthrottle-agentic-utils';
/**
 * @description The ONE parser for `git worktree list --porcelain` output. Shared by the checkout
 * inspection snapshot and by worktree discovery so the two can never disagree about which paths
 * count as linked worktrees.
 */

/**
 * @description Linked-worktree paths from `git worktree list --porcelain`, main worktree excluded.
 * git always lists the main worktree first, so it is dropped; a null/empty output yields [].
 */
export const parseLinkedWorktrees = (output: string | null): string[] => {
  if (output === null) return [];
  return (
    output
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice('worktree '.length).trim())
      .filter((path) => path !== '')
      // git lists the main worktree first; only the linked ones matter.
      .slice(1)
  );
};
const MAX_PATH_LENGTH = 4096;

/**
 * Validates a path before any filesystem access: absolute, sane length, no
 * NUL bytes, exists, and is a directory — the validateWorkingDirectory-style
 * checks from the design doc §6. Comparison happens in this process's view
 * (toContainerPath); the returned value is the resolved, process-view path.
 */
export const validateInspectionPath = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed.includes('\0')) {
    throw new Error('inspection path is empty or contains invalid characters');
  }
  if (trimmed.length > MAX_PATH_LENGTH) {
    throw new Error(
      `inspection path must be at most ${MAX_PATH_LENGTH} characters`,
    );
  }
  if (!isAbsolute(trimmed)) {
    throw new Error('inspection path must be an absolute path');
  }

  const resolved = toContainerPath(trimmed);
  if (!existsSync(resolved)) {
    throw new Error(`inspection path does not exist: ${trimmed}`);
  }
  if (!statSync(resolved).isDirectory()) {
    throw new Error(`inspection path is not a directory: ${trimmed}`);
  }

  return resolved;
};

/** Settings files whose `hooks` Claude Code runs in a checkout (project, then local). */
const CLAUDE_SETTINGS_FILES = [
  '.claude/settings.json',
  '.claude/settings.local.json',
] as const;

/** Project MCP configs a CLI connects in a checkout (Claude/grok, then Cursor). */
const MCP_CONFIG_FILES = ['.mcp.json', '.cursor/mcp.json'] as const;

/** Cursor's project hook config. */
const CURSOR_HOOKS_FILE = '.cursor/hooks.json';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

/**
 * @description A checkout file parsed as JSON, or undefined when it is missing or malformed —
 * inspection reports what it can and never throws on a repo's bad config.
 */
const readJsonFile = (root: string, relativePath: string): unknown => {
  try {
    return JSON.parse(readFileSync(join(root, relativePath), 'utf8'));
  } catch {
    return undefined;
  }
};

/**
 * @description Commands in a `hooks` object shaped `{ <event>: [ { hooks: [ … ] } ] }` (Claude) or
 * `{ <event>: [ { command } ] }` (Cursor): each matcher group's inner `hooks` count individually,
 * and a bare entry counts as one.
 */
const countHookEntries = (hooks: unknown): number => {
  if (!isPlainObject(hooks)) {
    return 0;
  }

  return Object.values(hooks).reduce<number>((total, entries) => {
    if (!Array.isArray(entries)) {
      return total;
    }

    return (
      total +
      entries.reduce<number>((sum, entry) => {
        if (isPlainObject(entry) && Array.isArray(entry.hooks)) {
          return sum + entry.hooks.length;
        }

        return sum + 1;
      }, 0)
    );
  }, 0);
};

/**
 * @description How much repo-local agent config a checkout would run in a plan run: hook commands
 * from Claude's project and local settings plus Cursor's `hooks.json`, and MCP servers from the
 * project `.mcp.json` and `.cursor/mcp.json`. What the trust gate suppresses for an untrusted
 * checkout. Missing or malformed files count as zero.
 */
export const countRepoAgentConfig = (
  root: string,
): { readonly hookCount: number; readonly mcpServerCount: number } => {
  const claudeHooks = CLAUDE_SETTINGS_FILES.reduce((total, file) => {
    const settings = readJsonFile(root, file);

    return (
      total + (isPlainObject(settings) ? countHookEntries(settings.hooks) : 0)
    );
  }, 0);
  const cursorConfig = readJsonFile(root, CURSOR_HOOKS_FILE);
  const cursorHooks = isPlainObject(cursorConfig)
    ? countHookEntries(cursorConfig.hooks)
    : 0;
  const mcpServerCount = MCP_CONFIG_FILES.reduce((total, file) => {
    const config = readJsonFile(root, file);
    const servers = isPlainObject(config) ? config.mcpServers : undefined;

    return total + (isPlainObject(servers) ? Object.keys(servers).length : 0);
  }, 0);

  return { hookCount: claudeHooks + cursorHooks, mcpServerCount };
};
