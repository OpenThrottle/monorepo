import { DETAIL_LEVELS } from '../config/index.ts';
import type { DetailLevel } from '../types/index.ts';

/**
 * @description User-facing copy for the ot-telemetry report: the fixed prose in `report.md` and
 * the CLI's failure messages. Every sentence here is a privacy claim someone may rely on before
 * sharing a report — keep it true to what the queries actually select.
 */

/** Top-level heading of `report.md`. */
export const REPORT_TITLE = '# OpenThrottle Usage Report';

/**
 * A one-line, honest note about what `detailLevel` actually changed about this run. Every level
 * says the same thing today (nothing varies by detail level yet) because no metric query branches
 * on it — this exists so the Markdown report never implies more was captured than the aggregate
 * default.
 */
export const DETAIL_LEVEL_DESCRIPTIONS: Readonly<Record<DetailLevel, string>> =
  {
    [DETAIL_LEVELS.AGGREGATE]:
      'aggregate: counts, sums, and distributions only — no titles, paths, or branch names.',
    [DETAIL_LEVELS.FULL]:
      'full: reserved for identifiers plus plan/task titles. No metric currently varies by ' +
      'detail level, so this run’s output is identical to aggregate.',
    [DETAIL_LEVELS.IDENTIFIERS]:
      'identifiers: reserved for repo/project/branch names. No metric currently varies by ' +
      'detail level, so this run’s output is identical to aggregate.',
  };

/** The "What is in this file" section of `report.md`, minus the per-run detail-level line. */
export const WHAT_IS_IN_THIS_FILE_COPY = {
  heading: '## What is in this file',
  identity:
    '- **Identity:** `actorKey` (if present) is a one-way hash of a git email, namespaced with a ' +
    'constant. It dedupes people across runs without naming anyone, and there is no way to read ' +
    'an email back out of it. It is pseudonymous, not anonymous: because the namespace is a ' +
    'public constant in the tool source, someone holding a list of candidate emails (a repo git log, ' +
    'say) can hash those and see which one matches. Treat it as "stable id for this person", ' +
    'not as "unlinkable to this person".',
  intro:
    'This report was generated entirely from a **local, read-only** connection to your ' +
    'OpenThrottle Postgres database. Nothing in this file — or in the run that produced it — ' +
    'was ever uploaded anywhere; there is no network call in this script other than that local ' +
    'Postgres connection. You can verify every claim below by reading `report.json` alongside ' +
    'this file: every number here traces back to a field in that envelope.',
  neverIncluded:
    '- **Never included, at any detail level today:** plan/task titles or descriptions, ' +
    'working-directory or file-system paths, git branch names, free-text args or invocation ' +
    'paths, or any provider `raw_usage` blob.',
} as const;

/** Wording shared by both connection failure paths so callers/tests can match on a stable prefix. */
export const POSTGRES_CONNECTION_FAILURE_PREFIX =
  '🚨 ot-telemetry could not reach a read-only Postgres connection.';

/** Printed to stderr after a successful run. */
export const RUN_COMPLETE_COPY = {
  nothingUploaded:
    'ot-telemetry: nothing was uploaded — this is a local-only read.',
  wrote: (outDir: string): string =>
    `ot-telemetry: wrote report(s) to ${outDir}`,
} as const;
