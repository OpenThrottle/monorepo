/**
 * @description Fails a pull request that makes a breaking change to the
 * committed GraphQL schema (`applications/openthrottle-server/schema.gql`)
 * unless the PR title carries the conventional breaking marker (`!`, as in
 * `feat(server)!: ...`).
 *
 * That ties a server major version bump to a breaking API change and enforces
 * deprecate-don't-remove: a `@deprecated` field is non-breaking, a removed one
 * is not. "Breaking" is `@graphql-inspector/core`'s own classification.
 *
 * Inputs (env, never interpolated into a shell line): `BASE_REF` (a git ref
 * holding the base schema, e.g. `origin/main`) and `PR_TITLE`.
 */
import { fileURLToPath } from 'node:url';

import { CriticalityLevel, diff } from '@graphql-inspector/core';
import { buildSchema } from 'graphql';

import { createLogger, run } from './utils/index.ts';

const logger = createLogger();

export const SCHEMA_PATH = 'applications/openthrottle-server/schema.gql';

/** `type!:` or `type(scope)!:` at the start of a conventional title. */
const BREAKING_TITLE_PATTERN = /^[a-z]+(\([^)]*\))?!:/i;

export interface BreakingChange {
  readonly message: string;
  readonly path: string | undefined;
}

export type SchemaCheckResult =
  | { readonly kind: 'invalid-schema'; readonly message: string }
  | {
      readonly kind: 'breaking-allowed';
      readonly changes: readonly BreakingChange[];
    }
  | {
      readonly kind: 'breaking-blocked';
      readonly changes: readonly BreakingChange[];
    }
  | { readonly kind: 'ok' };

/** Whether a PR title carries the conventional `!` breaking marker. */
export const hasBreakingMarker = (title: string): boolean => {
  return BREAKING_TITLE_PATTERN.test(title.trim());
};

/**
 * Diff two SDL strings and decide whether the change may land under `title`.
 * Returns a result instead of throwing on an unparseable schema.
 */
export const checkSchemaBreakingChanges = async (
  baseSdl: string,
  headSdl: string,
  title: string,
): Promise<SchemaCheckResult> => {
  let changes: readonly BreakingChange[];

  try {
    const found = await diff(buildSchema(baseSdl), buildSchema(headSdl));

    changes = found
      .filter(
        (change) => change.criticality.level === CriticalityLevel.Breaking,
      )
      .map((change) => ({ message: change.message, path: change.path }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return { kind: 'invalid-schema', message };
  }

  if (changes.length === 0) {
    return { kind: 'ok' };
  }

  return hasBreakingMarker(title)
    ? { changes, kind: 'breaking-allowed' }
    : { changes, kind: 'breaking-blocked' };
};

const readBaseSchema = (baseRef: string): string | undefined => {
  const result = run('git', ['show', `${baseRef}:${SCHEMA_PATH}`], {
    allowFailure: true,
  });

  return result.exitCode === 0 ? result.stdout : undefined;
};

const readHeadSchema = (): string => {
  return run('git', ['show', `HEAD:${SCHEMA_PATH}`]).stdout;
};

export const main = async (
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<number> => {
  const baseRef = env.BASE_REF;
  const title = env.PR_TITLE ?? '';

  if (baseRef === undefined || baseRef === '') {
    logger.fail('BASE_REF is required (a git ref holding the base schema, e.g. origin/main)'); // prettier-ignore

    return 1;
  }

  const baseSdl = readBaseSchema(baseRef);

  if (baseSdl === undefined) {
    logger.success(`GraphQL breaking changes: no ${SCHEMA_PATH} on ${baseRef}, nothing to compare`); // prettier-ignore

    return 0;
  }

  const headSdl = readHeadSchema();

  if (baseSdl === headSdl) {
    logger.success('GraphQL breaking changes: schema.gql unchanged');

    return 0;
  }

  const result = await checkSchemaBreakingChanges(baseSdl, headSdl, title);

  if (result.kind === 'invalid-schema') {
    logger.fail(`Could not parse a schema: ${result.message}`);

    return 1;
  }

  if (result.kind === 'ok') {
    logger.success('GraphQL breaking changes: none');

    return 0;
  }

  for (const change of result.changes) {
    logger.info(`  - ${change.message}`);
  }

  if (result.kind === 'breaking-allowed') {
    logger.success('Breaking GraphQL changes are allowed: the PR title carries `!`'); // prettier-ignore

    return 0;
  }

  logger.blank();
  logger.fail(`${result.changes.length} breaking GraphQL change(s) in ${SCHEMA_PATH}`); // prettier-ignore
  logger.info('Either keep the field and mark it `@deprecated(reason: "...")` (deprecate, never remove),'); // prettier-ignore
  logger.info('or mark the PR as breaking by adding `!` to its title, e.g. `feat(openthrottle-server)!: ...`.'); // prettier-ignore

  return 1;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(await main());
}
