import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { Inject, Injectable, Module, type Type } from '@nestjs/common';
import {
  Field,
  GraphQLModule,
  ObjectType,
  Query,
  Resolver,
} from '@nestjs/graphql';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { emitCodeFirstSchema } from './emit-code-first-schema.ts';

@ObjectType({ description: 'A widget the fixture resolver serves.' })
class EmitSchemaWidget {
  @Field(() => String, { description: 'Who last touched the widget.' })
  closedBy!: string;
}

@ObjectType({ description: 'Only reachable as an orphaned type.' })
class EmitSchemaOrphan {
  @Field(() => String)
  orphanField!: string;
}

let constructed = 0;

/**
 * Counts constructions. Standing in for a database pool or Redis client: if the
 * emitter ever instantiated app providers, this count would move.
 */
@Injectable()
class ExpensiveDependency {
  constructor() {
    constructed += 1;
  }
}

@Resolver(() => EmitSchemaWidget)
class EmitSchemaWidgetResolver {
  constructor(
    @Inject(ExpensiveDependency)
    private readonly dependency: ExpensiveDependency,
  ) {}

  @Query(() => EmitSchemaWidget)
  emitSchemaWidget(): EmitSchemaWidget {
    return { closedBy: String(this.dependency) };
  }
}

const buildFixtureModule = (autoSchemaFile: string): Type => {
  @Module({
    imports: [
      GraphQLModule.forRoot<ApolloDriverConfig>({
        autoSchemaFile,
        buildSchemaOptions: { orphanedTypes: [EmitSchemaOrphan] },
        driver: ApolloDriver,
      }),
    ],
    providers: [ExpensiveDependency, EmitSchemaWidgetResolver],
  })
  class EmitSchemaFixtureModule {}

  return EmitSchemaFixtureModule;
};

describe('emitCodeFirstSchema', () => {
  let directory: string;

  beforeEach(async () => {
    constructed = 0;
    directory = await mkdtemp(join(tmpdir(), 'emit-code-first-schema-'));
  });

  afterEach(async () => {
    await rm(directory, { force: true, recursive: true });
  });

  it('writes the autoSchemaFile a boot would write', async () => {
    const file = join(directory, 'schema.gql');

    await emitCodeFirstSchema(buildFixtureModule(file));

    const sdl = await readFile(file, 'utf8');

    expect(sdl).toContain('THIS FILE WAS AUTOMATICALLY GENERATED');
    expect(sdl).toContain('emitSchemaWidget: EmitSchemaWidget!');
    expect(sdl).toContain('"""Who last touched the widget."""');
    expect(sdl).toContain('type EmitSchemaOrphan {');
  });

  it('never instantiates the app providers', async () => {
    await emitCodeFirstSchema(
      buildFixtureModule(join(directory, 'schema.gql')),
    );

    expect(constructed).toBe(0);
  });
});
