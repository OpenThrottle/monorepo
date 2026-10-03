import { OPENTHROTTLE_POSTGRES_URL_ENV } from '@openthrottle/openthrottle-agentic-utils';

/**
 * @description Constants and defaults for the ot-telemetry report. Behavior
 * lives in `utils/`; user-facing prose lives in `data/data.copy.ts`.
 */

/** Bumped whenever the envelope shape changes in a way a consumer must handle. */
export const REPORT_SCHEMA_VERSION = 1;

/**
 * `aggregate` is the safe default per the README.md privacy contract. `identifiers` and `full` are
 * a DOCUMENTED OPT-IN surface for repo/project/branch names (`identifiers`) and, additionally,
 * titles (`full`) — see README.md's privacy-contract table. No metric family varies by detail
 * level yet: selecting `identifiers` or `full` today only changes `detailLevel` in the envelope
 * and the Markdown header, and `describeDetailLevel` says so plainly rather than letting the
 * report imply it captured more than it did.
 */
export const DETAIL_LEVELS = {
  AGGREGATE: 'aggregate',
  FULL: 'full',
  IDENTIFIERS: 'identifiers',
} as const;

/** Every valid `--detail` value, for CLI validation and help text. */
export const DETAIL_LEVEL_VALUES = [
  DETAIL_LEVELS.AGGREGATE,
  DETAIL_LEVELS.IDENTIFIERS,
  DETAIL_LEVELS.FULL,
] as const;

/** Default reporting window per README.md: last 90 days, ending now. */
export const DEFAULT_WINDOW_DAYS = 90;

/** Which file(s) a run writes. `both` (the default) writes `report.json` and `report.md`. */
export const OUTPUT_FORMATS = {
  BOTH: 'both',
  JSON: 'json',
  MD: 'md',
} as const;

/** Every valid `--format` value, for CLI validation and help text. */
export const OUTPUT_FORMAT_VALUES = [
  OUTPUT_FORMATS.BOTH,
  OUTPUT_FORMATS.JSON,
  OUTPUT_FORMATS.MD,
] as const;

/** File names written into `--out`. */
export const REPORT_FILE_NAMES = {
  JSON: 'report.json',
  MD: 'report.md',
} as const;

/**
 * Directory name under the OS temp dir used when `--out` is omitted — deliberately NOT inside this
 * repo's working tree, so the default can never be accidentally `git add`ed.
 */
export const DEFAULT_OUT_DIR_NAME = 'ot-telemetry-reports';

/**
 * Folded in ahead of the email before hashing, so an `actorKey` cannot be matched against a
 * generic sha256(email) rainbow table. Changing it changes every actor key, which breaks dedupe
 * against earlier reports — never change it without bumping {@link REPORT_SCHEMA_VERSION}.
 */
export const ACTOR_KEY_NAMESPACE = 'ot-telemetry:actor-key:v1';

/** Every env var the connection may consult, in resolution order — named in error messages. */
export const POSTGRES_ENV_VARS_TRIED = [
  OPENTHROTTLE_POSTGRES_URL_ENV,
  'POSTGRES_URL',
  'POSTGRES_HOST',
  'POSTGRES_PORT',
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
] as const;

/**
 * `schema_migrations` (see `scripts/openthrottle-database-migrations.ts`) has no numeric id
 * column — `filename` (e.g. `125_...sql`) is the ledger's primary key and, thanks to the
 * zero-padded numeric prefix convention, sorts lexically in applied order. `max(filename)` is
 * therefore the migration high-water mark.
 */
export const MIGRATION_LEDGER = {
  ID_COLUMN: 'filename',
  TABLE: 'schema_migrations',
} as const;

/** Max rows per Markdown table before the report shows a "top N of M" note. */
export const TABLE_ROW_LIMIT = 15;

/** Max `(skill_name, scope)` rows `metrics.skill_usage.bySkill` returns. */
export const BY_SKILL_LIMIT = 50;
