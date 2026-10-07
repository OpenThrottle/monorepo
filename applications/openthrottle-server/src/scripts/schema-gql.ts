import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { emitCodeFirstSchema } from '@openthrottle/nestjs-graphql';

import { AppModule } from '../app.module.ts';

/**
 * @description Emit or verify the committed code-first GraphQL schema without
 * booting the server.
 *
 * `schema.gql` is written by NestJS from the server's own decorators, but only
 * when the server boots. Every other guard (verify-graphql-codegen, the
 * codegen targets) checks consumers AGAINST this file; nothing checked the file
 * against the server. A changed type, field, description or deprecation
 * therefore passed check:local and either failed later in CI or landed as a
 * stale contract that consumers then generated from.
 *
 * This opens {@link AppModule} in Nest preview mode via
 * {@link emitCodeFirstSchema}: Nest's own schema builder writes the file, with
 * no database, Redis or HTTP listener. `AppModule` (PROCESS_ROLE=all) is the
 * composition the committed file comes from; the module import order inside it
 * decides the Query/Mutation field order, so another root would reorder it.
 *
 * `autoSchemaFile` is the relative path `schema.gql`, resolved against the
 * working directory when Nest writes it. That is the only seam used here: the
 * check emits from a temporary directory and compares, the write emits from the
 * server root. AppModule itself is left exactly as a boot sees it.
 *
 * Run through nx, which builds first and loads `.env.default` (some modules
 * read the environment at import time):
 *   pnpm nx run openthrottle-server:schema-gql-check
 *   pnpm nx run openthrottle-server:schema-gql-write
 */

/** build/src/scripts → the server project root. */
const SERVER_ROOT = resolve(import.meta.dirname, '..', '..', '..');
const SCHEMA_FILE = 'schema.gql';
const SCHEMA_PATH_FROM_REPO = `applications/openthrottle-server/${SCHEMA_FILE}`;
const WRITE_COMMAND = 'pnpm nx run openthrottle-server:schema-gql-write';
const CONTEXT_LINES = 3;

/**
 * @description Emit the schema with the working directory set to `directory`,
 * restoring the previous working directory afterwards.
 */
const emitInto = async (directory: string): Promise<void> => {
  const previous = process.cwd();

  process.chdir(directory);

  try {
    await emitCodeFirstSchema(AppModule);
  } finally {
    process.chdir(previous);
  }
};

/**
 * @description A few lines either side of the first difference — enough to
 * name what changed without dumping a 200 KB schema.
 */
const describeFirstDifference = (
  committed: string,
  emitted: string,
): string => {
  const committedLines = committed.split('\n');
  const emittedLines = emitted.split('\n');
  const length = Math.max(committedLines.length, emittedLines.length);
  let index = 0;

  while (index < length && committedLines[index] === emittedLines[index]) {
    index += 1;
  }

  const start = Math.max(0, index - CONTEXT_LINES);
  const end = index + CONTEXT_LINES + 1;
  const show = (lines: string[], marker: string): string =>
    lines
      .slice(start, end)
      .map((line, offset) =>
        start + offset === index ? `${marker} ${line}` : `  ${line}`,
      )
      .join('\n');

  return [
    `First difference at line ${index + 1}:`,
    `--- committed ${SCHEMA_PATH_FROM_REPO}`,
    show(committedLines, '-'),
    '+++ emitted from the server decorators',
    show(emittedLines, '+'),
  ].join('\n');
};

const check = async (): Promise<boolean> => {
  const directory = await mkdtemp(join(tmpdir(), 'openthrottle-schema-gql-'));

  try {
    await emitInto(directory);

    const [committed, emitted] = await Promise.all([
      readFile(join(SERVER_ROOT, SCHEMA_FILE), 'utf8'),
      readFile(join(directory, SCHEMA_FILE), 'utf8'),
    ]);

    if (committed === emitted) {
      console.log(`✅ ${SCHEMA_PATH_FROM_REPO} matches the server decorators.`);

      return true;
    }

    console.error(
      [
        `❌ ${SCHEMA_PATH_FROM_REPO} is stale: it no longer matches what the server's GraphQL decorators emit.`,
        '',
        describeFirstDifference(committed, emitted),
        '',
        `Regenerate it with:  ${WRITE_COMMAND}`,
        'then commit schema.gql and re-run consumer codegen (pnpm run check:local:codegen).',
      ].join('\n'),
    );

    return false;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

const write = async (): Promise<void> => {
  await emitInto(SERVER_ROOT);
  console.log(`✅ Wrote ${SCHEMA_PATH_FROM_REPO} from the server decorators.`);
};

if (process.argv.includes('--check')) {
  process.exitCode = (await check()) ? 0 : 1;
} else {
  await write();
}
