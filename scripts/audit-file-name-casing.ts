/**
 * @description Repo-wide audit for the file-name clause of
 * docs/monorepo/code-style.md § Naming conventions: a file named for its single
 * export takes that export's casing. `@typescript-eslint/naming-convention`
 * sees identifiers, never file names, so this is the only thing that can catch
 * a new `get-foo.ts` exporting `getFoo`.
 *
 * What counts as a violation is exactly what
 * {@link planRenames} in `codemod-file-name-casing.ts` would rename (or would
 * rename but for a name collision) — the audit and the codemod share one
 * definition, so the gate can never demand a rename the codemod refuses.
 *
 * Scope: the React Router applications and `react-router-*` packages, plus the
 * Electron shell. The NestJS tier has its own enforced `<folder>.<kind>.ts`
 * form and is out of scope.
 *
 * Usage: tsx ./scripts/audit-file-name-casing.ts [--json] [--strict]
 *   --json    emit the violations as JSON.
 *   --strict  exit non-zero on any violation. There is no allowlist: every
 *             file was renamed by OT plan bc5f6aa0, so a violation is new.
 * Report-only (exit 0) otherwise.
 */

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RenameCandidate } from './codemod-file-name-casing.ts';
import { planRenames, RENAME_STATUS } from './codemod-file-name-casing.ts';
import { createLogger } from './utils/index.ts';

const logger = createLogger();

/** Project directories the rule is enforced in. */
export const AUDITED_PROJECT_PATTERN =
  /^(?:applications\/openthrottle-(?:admin|app|cms|developer|website)|packages\/react-router-[a-z-]+)$/;

/** A file that should carry its export's name and does not. */
export interface FileNameCasingViolation {
  readonly exportName: string;
  readonly file: string;
  readonly suggested: string;
}

/** The audited project directories under a workspace root, sorted. */
export const auditedProjects = (workspaceRoot: string): string[] => {
  const projects: string[] = [];

  for (const area of ['applications', 'packages']) {
    const areaPath = path.join(workspaceRoot, area);
    if (!existsSync(areaPath)) continue;

    for (const entry of readdirSync(areaPath, { withFileTypes: true })) {
      const directory = `${area}/${entry.name}`;
      if (entry.isDirectory() && AUDITED_PROJECT_PATTERN.test(directory)) {
        projects.push(directory);
      }
    }
  }

  return projects.sort();
};

/** True when a codemod candidate is a violation of the rule. */
const isViolation = (candidate: RenameCandidate): boolean => {
  return candidate.status !== RENAME_STATUS.constant;
};

/** Every violation in the audited projects. */
export const findViolations = (
  workspaceRoot: string,
): FileNameCasingViolation[] => {
  return auditedProjects(workspaceRoot)
    .flatMap((project) => planRenames(workspaceRoot, project))
    .filter(isViolation)
    .map((candidate) => ({
      exportName: candidate.exportName,
      file: candidate.from.split(path.sep).join('/'),
      suggested: path.basename(candidate.to),
    }));
};

const run = (): void => {
  const json = process.argv.includes('--json');
  const strict = process.argv.includes('--strict');
  const workspaceRoot = path.resolve(import.meta.dirname, '..');
  const violations = findViolations(workspaceRoot);
  const failing = strict && violations.length > 0;

  if (json) {
    console.log(JSON.stringify(violations, null, 2));
    if (failing) process.exit(1);

    return;
  }

  logger.heading('File-name casing audit (single-export files take the export’s name)'); // prettier-ignore

  if (violations.length === 0) {
    logger.success('File-name casing OK — every single-export file is named for its export.'); // prettier-ignore

    return;
  }

  const report = strict ? logger.fail : logger.info;
  report(`${violations.length} file(s) not named for their single export — rename them with tsx ./scripts/codemod-file-name-casing.ts --project=<dir> --write:`); // prettier-ignore
  for (const violation of violations) {
    logger.detail(`${violation.file}  → ${violation.suggested}`);
  }

  if (failing) process.exit(1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
