/**
 * @description Fails when a committed file Claude Code reads is not strict
 * JSON. Claude Code does not tolerate comments or trailing commas in these
 * files: it skips the WHOLE file, so one `//` line in `.claude/settings.json`
 * silently disables every project hook, permission and MCP setting in it. That
 * is exactly what happened on 2026-09-23 (#560): skill-usage capture, the
 * plan-run janitor and the WorktreeCreate hook all stopped, and nothing said so
 * — 2.1.270 logs nothing at all, later versions log one line under `--debug`.
 *
 * Tracked files only (`git ls-files`), so local `settings.local.json` and
 * untracked scratch never produce findings nobody can act on.
 *
 * Out of scope: `.cursor/` and `.vscode/` files. Those editors read JSONC, and
 * `.cursor/worktrees.json` carries a comment today; whether Cursor tolerates
 * it is not what this check is for.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createLogger, run } from './utils/index.ts';

const logger = createLogger();

/**
 * Tracked paths Claude Code parses as JSON. Kept as explicit patterns rather
 * than "every .json" so the check states what it protects.
 */
export const CLAUDE_CONFIG_PATTERNS: readonly RegExp[] = [
  /(^|\/)\.claude\/[^/]+\.json$/,
  /(^|\/)\.claude-plugin\/[^/]+\.json$/,
  /(^|\/)\.mcp\.json$/,
  /^plugins\/[^/]+\/hooks\/hooks\.json$/,
];

/** A tracked config file that failed to parse, and the parser's reason. */
export interface InvalidConfigFile {
  readonly message: string;
  readonly path: string;
}

/** True when Claude Code reads this tracked path as JSON. */
export const isClaudeConfigPath = (path: string): boolean =>
  CLAUDE_CONFIG_PATTERNS.some((pattern) => pattern.test(path));

/** Tracked paths Claude Code reads as JSON, sorted. */
export const findClaudeConfigPaths = (cwd: string): string[] =>
  run('git', ['ls-files'], { cwd })
    .stdout.split('\n')
    .filter((path) => path !== '' && isClaudeConfigPath(path))
    .sort();

/** Strict-parse one file; null when it is valid JSON. */
export const parseConfigFile = (
  cwd: string,
  path: string,
): InvalidConfigFile | null => {
  try {
    JSON.parse(readFileSync(join(cwd, path), 'utf8'));

    return null;
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : String(error),
      path,
    };
  }
};

export const main = (cwd: string = process.cwd()): number => {
  const paths = findClaudeConfigPaths(cwd);
  const invalid = paths
    .map((path) => parseConfigFile(cwd, path))
    .filter((result): result is InvalidConfigFile => result !== null);

  if (invalid.length === 0) {
    logger.success(`Claude config JSON: ${paths.length} tracked file(s), all strict JSON`); // prettier-ignore

    return 0;
  }

  logger.fail(`${invalid.length} file(s) Claude Code reads are not strict JSON:`); // prettier-ignore
  for (const file of invalid) {
    logger.info(`  ${file.path}: ${file.message}`);
  }

  logger.blank();
  logger.info('Claude Code skips an unparseable file entirely — every hook,');
  logger.info('permission and setting in it stops loading, with no visible error.'); // prettier-ignore
  logger.info(
    'Remove comments and trailing commas; put notes in docs instead.',
  );

  return 1;
};

if (process.argv[1]?.endsWith('check-claude-config-json.ts')) {
  process.exit(main());
}
