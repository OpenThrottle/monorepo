import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Module, type Type } from '@nestjs/common';
import {
  Field,
  GraphQLModule,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  GRAPHQL_SCHEMA_FILE_ENV,
  resolveAutoSchemaFile,
} from './auto-schema-file.ts';
import {
  type RootModuleLoader,
  runGraphqlSchemaCommand,
} from './graphql-schema-command.ts';

@ObjectType()
class CommandWidget {
  @Field(() => String, { description: 'Who last touched the widget.' })
  closedBy!: string;
}

@Resolver(() => CommandWidget)
class CommandWidgetResolver {
  @Query(() => CommandWidget)
  commandWidget(): CommandWidget {
    return { closedBy: 'fixture' };
  }
}

/**
 * Built when the loader runs, as an app's root module is: `autoSchemaFile` comes
 * from `resolveAutoSchemaFile()`, exactly as NestjsGraphqlModule configures it,
 * and reads the environment the command set before loading.
 */
const buildFixtureModule = (): Type => {
  @Module({
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile: resolveAutoSchemaFile(),
        driver: ApolloDriver,
      }),
    ],
    providers: [CommandWidgetResolver],
  })
  class CommandFixtureModule {}

  return CommandFixtureModule;
};

const loadFixture: RootModuleLoader = async () => ({
  ok: true,
  value: buildFixtureModule(),
});

const SCHEMA = 'applications/api/schema.gql';
const BASE_ARGS = [
  '--module=./build/src/app.module.js',
  '--project=api',
  `--schema=${SCHEMA}`,
];

const errors = (): string => vi.mocked(console.error).mock.calls.join('\n');

describe('runGraphqlSchemaCommand', () => {
  let workspace: string;
  let env: NodeJS.ProcessEnv;
  let schemaPath: string;

  beforeEach(async () => {
    workspace = await mkdtemp(join(tmpdir(), 'graphql-schema-command-'));
    env = { NX_WORKSPACE_ROOT: workspace };
    schemaPath = join(workspace, SCHEMA);
    await mkdir(join(workspace, 'applications/api'), { recursive: true });
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await rm(workspace, { force: true, recursive: true });
  });

  const run = (
    argv: readonly string[],
    load: RootModuleLoader = loadFixture,
  ): Promise<number> => runGraphqlSchemaCommand(argv, env, '/cwd', load);

  describe('arguments', () => {
    it('resolves --module against cwd and defaults the export to AppModule', async () => {
      const load = vi.fn<RootModuleLoader>(async () => ({
        error: 'stop here',
        ok: false,
      }));

      expect(await run([...BASE_ARGS, '--check'], load)).toBe(2);
      expect(load).toHaveBeenCalledWith(
        '/cwd/build/src/app.module.js',
        'AppModule',
      );
    });

    it('passes --export through to the loader', async () => {
      const load = vi.fn<RootModuleLoader>(async () => ({
        error: 'stop here',
        ok: false,
      }));

      await run([...BASE_ARGS, '--check', '--export=ApiModule'], load);

      expect(load).toHaveBeenCalledWith(
        '/cwd/build/src/app.module.js',
        'ApiModule',
      );
    });

    it.each([
      ['neither --check nor --write', BASE_ARGS],
      ['both --check and --write', [...BASE_ARGS, '--check', '--write']],
      ['a missing --module', [...BASE_ARGS.slice(1), '--check']],
      ['an unknown flag', [...BASE_ARGS, '--check', '--nope']],
    ])('exits 2 with usage for %s', async (_case, argv) => {
      expect(await run(argv)).toBe(2);
      expect(errors()).toContain('Run through nx');
    });

    it('exits 2 with usage when NX_WORKSPACE_ROOT is unset', async () => {
      env = {};

      expect(await run([...BASE_ARGS, '--check'])).toBe(2);
      expect(errors()).toContain('Run through nx');
    });
  });

  it('exits 2 when the module file has no class under that export', async () => {
    const module = resolve(import.meta.dirname, 'emit-code-first-schema.ts');

    expect(
      await runGraphqlSchemaCommand(
        [...BASE_ARGS, `--module=${module}`, '--check'],
        env,
        '/cwd',
      ),
    ).toBe(2);
    expect(errors()).toContain('has no class export named AppModule');
  });

  it('writes the schema at --schema and leaves the cwd unchanged', async () => {
    const cwd = process.cwd();

    expect(await run([...BASE_ARGS, '--write'])).toBe(0);
    expect(process.cwd()).toBe(cwd);
    expect(await readFile(schemaPath, 'utf8')).toContain(
      'commandWidget: CommandWidget!',
    );
  });

  it('hands the loader the emit target and restores the environment afterwards', async () => {
    const seen: (string | undefined)[] = [];
    const load: RootModuleLoader = async () => {
      seen.push(process.env[GRAPHQL_SCHEMA_FILE_ENV]);

      return { ok: true, value: buildFixtureModule() };
    };

    await run([...BASE_ARGS, '--write'], load);
    await run([...BASE_ARGS, '--check'], load);

    expect(seen[0]).toBe(schemaPath);
    expect(seen[1]).toContain('graphql-schema-');
    expect(seen[1]).not.toBe(schemaPath);
    expect(process.env[GRAPHQL_SCHEMA_FILE_ENV]).toBeUndefined();
  });

  it('leaves the committed schema alone when checking', async () => {
    await run([...BASE_ARGS, '--write']);
    const committed = await readFile(schemaPath, 'utf8');

    await writeFile(schemaPath, `# drift\n${committed}`);
    await run([...BASE_ARGS, '--check']);

    expect(await readFile(schemaPath, 'utf8')).toBe(`# drift\n${committed}`);
  });

  it('exits 0 when the committed schema matches', async () => {
    await run([...BASE_ARGS, '--write']);

    expect(await run([...BASE_ARGS, '--check'])).toBe(0);
  });

  it('exits 1 on drift, showing the first difference and the regenerate command', async () => {
    await run([...BASE_ARGS, '--write']);
    const committed = await readFile(schemaPath, 'utf8');
    await writeFile(schemaPath, `# drift\n${committed}`);

    expect(await run([...BASE_ARGS, '--check'])).toBe(1);
    expect(errors()).toContain(`${SCHEMA} is stale`);
    expect(errors()).toContain('First difference at line 1:');
    expect(errors()).toContain('- # drift');
    expect(errors()).toContain('pnpm nx run api:graphql-schema:write');
  });
});
