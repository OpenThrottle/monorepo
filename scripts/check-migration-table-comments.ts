/**
 * @description Diff-scoped lint: changed migration files with CREATE TABLE must
 * include COMMENT ON TABLE for each created table in the same file (038 pattern).
 * Covers every database in `databases/database-registry.ts`; pure renames are
 * not changes (see utils/migration-diff.ts).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { DATABASES } from '../databases/database-registry.ts';
import { findUncommentedTables } from './check-migration-table-comments.rules.ts';
import { createLogger } from './utils/logger.ts';
import {
  changedMigrationPaths,
  migrationDiffArgs,
} from './utils/migration-diff.ts';

const logger = createLogger();

const ROOT = process.cwd();
/** Every database's migrations directory, plus where any of them used to live (so a move pairs as a rename). */
const MIGRATIONS_DIRS = DATABASES.flatMap((database) => [
  database.migrationsPath,
  ...database.legacyMigrationsPaths,
]);

const resolveBaseRef = (): string => {
  return (
    process.env.MIGRATION_COMMENT_LINT_BASE?.trim() ||
    process.env.GITHUB_BASE_REF?.trim() ||
    'main'
  );
};

const resolveMergeBase = (baseRef: string): string => {
  try {
    return execFileSync('git', ['merge-base', 'HEAD', baseRef], {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    return baseRef;
  }
};

const listChangedMigrationFiles = (baseRef: string): readonly string[] => {
  const mergeBase = resolveMergeBase(baseRef);
  const output = execFileSync(
    'git',
    migrationDiffArgs(`${mergeBase}...HEAD`, MIGRATIONS_DIRS),
    { cwd: ROOT, encoding: 'utf8' },
  );

  return changedMigrationPaths(output);
};

const validateMigrationFile = (relativePath: string): readonly string[] => {
  return findUncommentedTables(
    readFileSync(path.join(ROOT, relativePath), 'utf8'),
  );
};

const run = (): void => {
  const baseRef = resolveBaseRef();
  const changedFiles = listChangedMigrationFiles(baseRef);

  if (changedFiles.length === 0) {
    logger.success(
      `check-migration-table-comments: OK (no changed files under ${MIGRATIONS_DIRS.join(', ')} vs ${baseRef})`,
    );
    return;
  }

  const violations: string[] = [];

  for (const file of changedFiles) {
    const missing = validateMigrationFile(file);
    for (const table of missing) {
      violations.push(
        `${file}: CREATE TABLE ${table} requires COMMENT ON TABLE ${table} in the same file (see .agents/skills/ot-postgres/SKILL.md)`,
      );
    }
  }

  if (violations.length > 0) {
    for (const violation of violations) {
      logger.fail(`check-migration-table-comments: error: ${violation}`);
    }
    logger.fail(
      `check-migration-table-comments: ${violations.length} violation(s); add COMMENT ON TABLE in the same migration as CREATE TABLE`,
    );
    process.exit(1);
  }

  logger.success(
    `check-migration-table-comments: OK (${changedFiles.length} changed migration file(s) vs ${baseRef})`,
  );
};

run();
