/**
 * @description CI drift guard: .agents/ is SSOT; editor trees must be
 * symlinks only. Wired as the `monorepo:check-agent-assets-ssot` target in
 * nx.json — its explicit {workspaceRoot} input globs must list this file.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, lstatSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLogger } from './lib/index.ts';

const logger = createLogger();

/** One filesystem fact per interesting path, decoupled from fs for tests. */
export interface AssetEntry {
  isSymlink: boolean;
  /** Repo-relative path, e.g. `.cursor/rules/foo.mdc`. */
  path: string;
  /** False for a broken symlink (target missing). */
  targetExists: boolean;
}

/**
 * The SSOT rules, as data → violations:
 *  - .cursor/rules/**\/*.mdc must be working symlinks into .agents/rules
 *    (except the gitignored nx-rules.mdc), and README.md too when present.
 *  - .agents/rules/**\/*.mdc must be regular files (SSOT bodies).
 */
export const collectRuleViolations = (
  cursorRules: AssetEntry[],
  agentRules: AssetEntry[],
): string[] => {
  const violations: string[] = [];

  for (const entry of cursorRules) {
    if (entry.path === '.cursor/rules/nx-rules.mdc') {
      continue;
    }

    if (!entry.isSymlink) {
      violations.push(`${entry.path} is a regular file (edit under .agents/rules/ only)`); // prettier-ignore

      continue;
    }

    if (!entry.targetExists) {
      violations.push(`${entry.path} is a broken symlink`);
    }
  }

  for (const entry of agentRules) {
    if (entry.isSymlink) {
      violations.push(`${entry.path} must be a regular file (SSOT body)`);
    }
  }

  return violations;
};

const readEntry = (root: string, path: string): AssetEntry => {
  const absolute = join(root, path);

  let isSymlink = false;
  try {
    isSymlink = lstatSync(absolute).isSymbolicLink();
  } catch {
    isSymlink = false;
  }

  return { isSymlink, path, targetExists: existsSync(absolute) };
};

const main = (): void => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const violations: string[] = [];

  // Skills: ot-skill-sync owns the layout (skills/ = authored SSOT,
  // .agents/skills = merged view, <agent>/skills = generated fan-out). Its
  // --check validates the whole two-stage pipeline without writing.
  const skillCheck = spawnSync('bash', ['skills/ot-skill-sync/scripts/sync.sh', '--check'], { cwd: root, stdio: 'inherit' }); // prettier-ignore

  if (skillCheck.status !== 0 || skillCheck.error) {
    violations.push('skill layout drift (see ot-skill-sync output above; run: bash skills/ot-skill-sync/scripts/sync.sh)'); // prettier-ignore
  }

  const cursorRules = globSync(join(root, '.cursor/rules/**/*.mdc')).map((absolute) => readEntry(root, relative(root, absolute))); // prettier-ignore
  const agentRules = globSync(join(root, '.agents/rules/**/*.mdc')).map((absolute) => readEntry(root, relative(root, absolute))); // prettier-ignore

  if (existsSync(join(root, '.cursor/rules/README.md'))) {
    const readme = readEntry(root, '.cursor/rules/README.md');

    if (!readme.isSymlink) {
      violations.push('.cursor/rules/README.md must symlink to .agents/rules/README.md'); // prettier-ignore
    }
  }

  violations.push(...collectRuleViolations(cursorRules, agentRules));

  if (violations.length > 0) {
    for (const violation of violations) {
      logger.fail(`check-agent-assets-ssot: ${violation}`);
    }

    logger.fail(`check-agent-assets-ssot: ${violations.length} violation(s). Edit .agents/skills/ and .agents/rules/ only; recreate editor symlinks.`); // prettier-ignore
    process.exit(1);
  }

  logger.success('check-agent-assets-ssot: OK');
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
