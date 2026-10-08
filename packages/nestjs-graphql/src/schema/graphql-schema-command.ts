import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import type { Type } from '@nestjs/common';

import { emitCodeFirstSchema } from './emit-code-first-schema.ts';

/**
 * The emit-or-verify command behind the shared `graphql-schema` Nx target
 * (nx.json targetDefaults), run through this package's `src/bin.ts`.
 *
 * A code-first API's committed `schema.gql` is written by Nest from the app's
 * decorators, but only when the app boots. Consumers' codegen is checked
 * AGAINST that file; this checks the file against the app, so a changed type,
 * field, description or deprecation cannot pass check:local as a stale
 * contract.
 *
 * The app's root module is opened in Nest preview mode via
 * {@link emitCodeFirstSchema}: Nest's own schema builder writes the file, with
 * no database, Redis or HTTP listener. The root module decides the
 * Query/Mutation field order through its import order, so it must be the same
 * composition the committed file comes from.
 *
 * `autoSchemaFile` must be the relative path `schema.gql` (the
 * NestjsGraphqlModule default), resolved against the working directory when
 * Nest writes it. That is the only seam used: `check` emits from a temporary
 * directory and compares, `write` emits from the schema's own directory. The
 * root module is left exactly as a boot sees it.
 */

/** The file name `autoSchemaFile` writes; `--schema` must end in it. */
const AUTO_SCHEMA_FILE = 'schema.gql';
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

  if (basename(schema) !== AUTO_SCHEMA_FILE) {
    return {
      error: `--schema must name a ${AUTO_SCHEMA_FILE} file (that is what autoSchemaFile writes); got ${schema}.`,
      ok: false,
    };
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
 * @description Emit the schema with the working directory set to `directory`,
 * restoring the previous working directory afterwards.
 */
const emitInto = async (rootModule: Type, directory: string): Promise<void> => {
  const previous = process.cwd();

  process.chdir(directory);

  try {
    await emitCodeFirstSchema(rootModule);
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
 * @description Emit `rootModule`'s schema into a temporary directory and
 * compare it with the committed file. Resolves `true` when they match.
 */
const checkGraphqlSchema = async (
  rootModule: Type,
  options: GraphqlSchemaOptions,
): Promise<boolean> => {
  const directory = await mkdtemp(join(tmpdir(), 'graphql-schema-'));

  try {
    await emitInto(rootModule, directory);

    const [committed, emitted] = await Promise.all([
      readFile(options.schemaPath, 'utf8'),
      readFile(join(directory, AUTO_SCHEMA_FILE), 'utf8'),
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
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
};

/**
 * @description Emit `rootModule`'s schema over the committed file.
 */
const writeGraphqlSchema = async (
  rootModule: Type,
  options: GraphqlSchemaOptions,
): Promise<void> => {
  await emitInto(rootModule, dirname(options.schemaPath));
  console.log(
    `✅ Wrote ${options.schemaDisplayPath} from the GraphQL decorators.`,
  );
};

/** Resolves the root module class named by `--module` / `--export`. */
export type RootModuleLoader = (
  modulePath: string,
  exportName: string,
) => Promise<Result<Type>>;

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
  const loaded = await load(options.modulePath, options.exportName);

  if (!loaded.ok) {
    console.error(loaded.error);

    return 2;
  }

  if (options.mode === 'write') {
    await writeGraphqlSchema(loaded.value, options);

    return 0;
  }

  return (await checkGraphqlSchema(loaded.value, options)) ? 0 : 1;
};
