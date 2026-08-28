/**
 * @description Diff-scoped lint: changed migration files with CREATE TABLE must
 * include COMMENT ON TABLE for each created table in the same file (038 pattern).
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { createLogger } from './lib/index.ts';

const logger = createLogger();

const ROOT = process.cwd();
const MIGRATIONS_DIR = 'databases/migrations';

const CREATE_TABLE_PATTERN =
  /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-z][a-z0-9_]*)/gi;

const COMMENT_ON_TABLE_PATTERN = /COMMENT\s+ON\s+TABLE\s+([a-z][a-z0-9_]*)/gi;

const resolveBaseRef = (): string =>
  process.env.MIGRATION_COMMENT_LINT_BASE?.trim() ||
  process.env.GITHUB_BASE_REF?.trim() ||
  'main';

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
    ['diff', '--name-only', `${mergeBase}...HEAD`, '--', `${MIGRATIONS_DIR}/`],
    { cwd: ROOT, encoding: 'utf8' },
  ).trim();

  if (!output) {
    return [];
  }

  return output
    .split('\n')
    .map((file) => file.trim())
    .filter((file) => file.endsWith('.sql'));
};

const collectMatches = (
  content: string,
  pattern: RegExp,
): readonly string[] => {
  const names: string[] = [];
  const re = new RegExp(pattern.source, pattern.flags);
  let match = re.exec(content);
  while (match) {
    const tableName = match[1];
    if (tableName) {
      names.push(tableName);
    }
    match = re.exec(content);
  }
  return names;
};

const validateMigrationFile = (relativePath: string): readonly string[] => {
  const absolutePath = path.join(ROOT, relativePath);
  const content = readFileSync(absolutePath, 'utf8');
  const createdTables = collectMatches(content, CREATE_TABLE_PATTERN);

  if (createdTables.length === 0) {
    return [];
  }

  const commentedTables = new Set(
    collectMatches(content, COMMENT_ON_TABLE_PATTERN),
  );

  return createdTables.filter((table) => !commentedTables.has(table));
};

const run = (): void => {
  const baseRef = resolveBaseRef();
  const changedFiles = listChangedMigrationFiles(baseRef);

  if (changedFiles.length === 0) {
    logger.success(
      `check-migration-table-comments: OK (no changed files under ${MIGRATIONS_DIR}/ vs ${baseRef})`,
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
