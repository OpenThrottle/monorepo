import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import type { Type } from '@nestjs/common';

import { GRAPHQL_SCHEMA_FILE_ENV } from './auto-schema-file.ts';
import { emitCodeFirstSchema } from './emit-code-first-schema.ts';

/**
 * The emit-or-verify command behind the shared `graphql-schema` Nx target
 * (nx.json targetDefaults), run through this package's `src/bin.ts`.
 *
 * A code-first API's committed `schema.gql` is written by Nest from the app's
 * decorators, and only by this command: a server boot keeps the schema in
 * memory. Consumers' codegen is checked AGAINST that file; this checks the file
 * against the app, so a changed type, field, description or deprecation cannot
 * pass check:local as a stale contract.
 *
 * The app's root module is opened in Nest preview mode via
 * {@link emitCodeFirstSchema}: Nest's own schema builder writes the file, with
 * no database, Redis or HTTP listener. The root module decides the
 * Query/Mutation field order through its import order, so it must be the same
 * composition the committed file comes from.
 *
 * The one seam is {@link GRAPHQL_SCHEMA_FILE_ENV}: NestjsGraphqlModule resolves
 * its `autoSchemaFile` from it when `forRoot` runs, so the command sets it
 * BEFORE importing the root module. `check` points it at a temporary file and
 * compares; `write` points it at the committed schema. The root module is left
 * exactly as a boot sees it.
 */

/** The file name `check` emits into its temporary directory. */
const TEMPORARY_SCHEMA_FILE = 'schema.gql';
const CONTEXT_LINES = 3;
const DEFAULT_EXPORT_NAME = 'AppModule';

const USAGE = [
  'Run through nx: pnpm nx run <project>:graphql-schema:check (or :write).',
  'The target passes --module, --project, --schema and exactly one of --check/--write; Nx sets NX_WORKSPACE_ROOT.',
].join('\n');

interface GraphqlSchemaOptions {
  /** Export of {@link modulePath} holding the root module class. */
  readonly exportName: string;
  readonly mode: 'check' | 'write';
  /** Absolute path of the BUILT module file that exports the root module. */
  readonly modulePath: string;
  /** `--schema` as passed: workspace-relative, for messages. */
  readonly schemaDisplayPath: string;
  /** Absolute path of the committed schema. */
  readonly schemaPath: string;
  /** The command that regenerates the schema, printed on drift. */
  readonly writeCommand: string;
}

export interface Success<T> {
  readonly ok: true;
  readonly value: T;
}

export interface Failure {
  readonly error: string;
  readonly ok: false;
}

export type Result<T> = Failure | Success<T>;

const readFlags = (argv: readonly string[]) => {
  try {
    const { values } = parseArgs({
      args: [...argv],
      options: {
        check: { type: 'boolean' },
        export: { default: DEFAULT_EXPORT_NAME, type: 'string' },
        module: { type: 'string' },
        project: { type: 'string' },
        schema: { type: 'string' },
        write: { type: 'boolean' },
      },
    });

    return { ok: true, value: values } as const;
  } catch (error) {
    return { error: `${String(error)}\n${USAGE}`, ok: false } as const;
  }
};

/**
 * @description Read the command's options from argv and the Nx task
 * environment. `--module` resolves against `cwd` (the project root under nx);
 * `--schema` resolves against `NX_WORKSPACE_ROOT`.
 */
const parseGraphqlSchemaArgs = (
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
): Result<GraphqlSchemaOptions> => {
  const flags = readFlags(argv);

  if (!flags.ok) {
    return flags;
  }

  const workspaceRoot = env['NX_WORKSPACE_ROOT'];
  const {
    check,
    export: exportName,
    module,
    project,
    schema,
    write,
  } = flags.value;

  if (!workspaceRoot || !module || !project || !schema || check === write) {
    return { error: USAGE, ok: false };
  }

  return {
    ok: true,
    value: {
      exportName,
      mode: check ? 'check' : 'write',
      modulePath: resolve(cwd, module),
      schemaDisplayPath: schema,
      schemaPath: resolve(workspaceRoot, schema),
      writeCommand: `pnpm nx run ${project}:graphql-schema:write`,
    },
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isModuleClass = (value: unknown): value is Type =>
  typeof value === 'function';

/**
 * @description Import the built module file and pick out the root module
 * class. Importing evaluates the app's module graph, so any environment it
 * reads at import time must already be loaded.
 */
const loadRootModule = async (
  modulePath: string,
  exportName: string,
): Promise<Result<Type>> => {
  const namespace: unknown = await import(pathToFileURL(modulePath).href);
  const candidate = isRecord(namespace) ? namespace[exportName] : undefined;

  if (!isModuleClass(candidate)) {
    return {
      error: `${modulePath} has no class export named ${exportName}. Is the project built, and does --module point at its root module?`,
      ok: false,
    };
  }

  return { ok: true, value: candidate };
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
  const show = (lines: readonly string[], marker: string): string =>
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
    '+++ emitted from the GraphQL decorators',
    show(emittedLines, '+'),
  ].join('\n');
};

/**
 * @description Compare the committed file with the one the decorators emitted.
 * Resolves `true` when they match.
 */
const compareGraphqlSchema = async (
  emittedPath: string,
  options: GraphqlSchemaOptions,
): Promise<boolean> => {
  const [committed, emitted] = await Promise.all([
    readFile(options.schemaPath, 'utf8'),
    readFile(emittedPath, 'utf8'),
  ]);

  if (committed === emitted) {
    console.log(
      `✅ ${options.schemaDisplayPath} matches the GraphQL decorators.`,
    );

    return true;
  }

  console.error(
    [
      `❌ ${options.schemaDisplayPath} is stale: it no longer matches what the GraphQL decorators emit.`,
      '',
      describeFirstDifference(options.schemaDisplayPath, committed, emitted),
      '',
      `Regenerate it with:  ${options.writeCommand}`,
      'then commit schema.gql and re-run consumer codegen (pnpm run check:local:codegen).',
    ].join('\n'),
  );

  return false;
};

/** Resolves the root module class named by `--module` / `--export`. */
export type RootModuleLoader = (
  modulePath: string,
  exportName: string,
) => Promise<Result<Type>>;

/**
 * @description Load the root module and emit its schema to `emitPath`, which
 * {@link GRAPHQL_SCHEMA_FILE_ENV} carries into the module's `autoSchemaFile`.
 * The variable is set before the module is imported (it is read when
 * `forRoot` runs) and put back afterwards.
 */
const emitToFile = async (
  emitPath: string,
  options: GraphqlSchemaOptions,
  load: RootModuleLoader,
): Promise<Failure | Success<undefined>> => {
  const previous = process.env[GRAPHQL_SCHEMA_FILE_ENV];

  process.env[GRAPHQL_SCHEMA_FILE_ENV] = emitPath;

  try {
    const loaded = await load(options.modulePath, options.exportName);

    if (!loaded.ok) {
      return loaded;
    }

    await emitCodeFirstSchema(loaded.value);

    return { ok: true, value: undefined };
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, GRAPHQL_SCHEMA_FILE_ENV);
    } else {
      process.env[GRAPHQL_SCHEMA_FILE_ENV] = previous;
    }
  }
};

/**
 * @description Run the command end to end and resolve its exit code: 0 when
 * the schema matches or was written, 1 on drift, 2 on a usage or load error.
 * `load` defaults to importing the built module file; tests pass a fixture.
 */
export const runGraphqlSchemaCommand = async (
  argv: readonly string[],
  env: NodeJS.ProcessEnv,
  cwd: string,
  load: RootModuleLoader = loadRootModule,
): Promise<number> => {
  const parsed = parseGraphqlSchemaArgs(argv, env, cwd);

  if (!parsed.ok) {
    console.error(parsed.error);

    return 2;
  }

  const options = parsed.value;

  if (options.mode === 'write') {
    const written = await emitToFile(options.schemaPath, options, load);

    if (!written.ok) {
      console.error(written.error);

      return 2;
    }

    console.log(
      `✅ Wrote ${options.schemaDisplayPath} from the GraphQL decorators.`,
    );

    return 0;
  }

  const directory = await mkdtemp(join(tmpdir(), 'graphql-schema-'));

  try {
    const emittedPath = join(directory, TEMPORARY_SCHEMA_FILE);
    const emitted = await emitToFile(emittedPath, options, load);

    if (!emitted.ok) {
      console.error(emitted.error);

      return 2;
    }

    return (await compareGraphqlSchema(emittedPath, options)) ? 0 : 1;
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};
