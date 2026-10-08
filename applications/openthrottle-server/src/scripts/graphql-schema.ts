import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';

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
 * schema's own directory. AppModule itself is left exactly as a boot sees it.
 *
 * Where the schema lives and which project owns it are not known here: the
 * shared `graphql-schema` target in nx.json passes `--schema={projectRoot}/schema.gql`
 * and `--project={projectName}`, and Nx supplies `NX_WORKSPACE_ROOT`. Run it
 * through nx, which also builds first and loads `.env.default` (some modules
 * read the environment at import time):
 *   pnpm nx run openthrottle-server:graphql-schema:check
 *   pnpm nx run openthrottle-server:graphql-schema:write
 */

/** The file name `autoSchemaFile` writes; `--schema` must end in it. */
const AUTO_SCHEMA_FILE = 'schema.gql';
const CONTEXT_LINES = 3;

interface SchemaTarget {
  /** Absolute path of the committed schema. */
  readonly absolutePath: string;
  /** `--schema` as passed: workspace-relative, for messages. */
  readonly displayPath: string;
  readonly mode: 'check' | 'write';
  readonly writeCommand: string;
}

/**
 * @description Read the target from argv and the Nx task environment, failing
 * loudly when run outside nx or with a schema `autoSchemaFile` cannot write.
 */
const readSchemaTarget = (): SchemaTarget => {
  const { values } = parseArgs({
    options: {
      check: { type: 'boolean' },
      project: { type: 'string' },
      schema: { type: 'string' },
      write: { type: 'boolean' },
    },
  });
  const workspaceRoot = process.env['NX_WORKSPACE_ROOT'];
  const { check, project, schema, write } = values;

  if (!workspaceRoot || !project || !schema || check === write) {
    throw new Error(
      'Run through nx: pnpm nx run <project>:graphql-schema:check (or :write). ' +
        'The target passes --project, --schema and exactly one of --check/--write; Nx sets NX_WORKSPACE_ROOT.',
    );
  }

  if (basename(schema) !== AUTO_SCHEMA_FILE) {
    throw new Error(
      `--schema must name a ${AUTO_SCHEMA_FILE} file (that is what autoSchemaFile writes); got ${schema}.`,
    );
  }

  return {
    absolutePath: resolve(workspaceRoot, schema),
    displayPath: schema,
    mode: check ? 'check' : 'write',
    writeCommand: `pnpm nx run ${project}:graphql-schema:write`,
  };
};

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
  displayPath: string,
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
    `--- committed ${displayPath}`,
    show(committedLines, '-'),
    '+++ emitted from the server decorators',
    show(emittedLines, '+'),
  ].join('\n');
};

const check = async (target: SchemaTarget): Promise<boolean> => {
  const directory = await mkdtemp(
    join(tmpdir(), 'openthrottle-graphql-schema-'),
  );

  try {
    await emitInto(directory);

    const [committed, emitted] = await Promise.all([
      readFile(target.absolutePath, 'utf8'),
      readFile(join(directory, AUTO_SCHEMA_FILE), 'utf8'),
    ]);

    if (committed === emitted) {
      console.log(`✅ ${target.displayPath} matches the server decorators.`);

      return true;
    }

    console.error(
      [
        `❌ ${target.displayPath} is stale: it no longer matches what the server's GraphQL decorators emit.`,
        '',
        describeFirstDifference(target.displayPath, committed, emitted),
        '',
        `Regenerate it with:  ${target.writeCommand}`,
        'then commit schema.gql and re-run consumer codegen (pnpm run check:local:codegen).',
      ].join('\n'),
    );

    return false;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

const write = async (target: SchemaTarget): Promise<void> => {
  await emitInto(dirname(target.absolutePath));
  console.log(`✅ Wrote ${target.displayPath} from the server decorators.`);
};

const target = readSchemaTarget();

if (target.mode === 'check') {
  process.exitCode = (await check(target)) ? 0 : 1;
} else {
  await write(target);
}
