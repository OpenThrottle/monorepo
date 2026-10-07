import type { DynamicModule, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Write the code-first SDL that `rootModule` emits to its `autoSchemaFile`,
 * without booting the app.
 *
 * Opens the module graph in Nest **preview mode**: every module and provider
 * is registered and resolved, but nothing is instantiated and no lifecycle hook
 * runs — no database pool, no Redis client, no HTTP listener. The one exception
 * is `GraphQLModule`, which `@nestjs/graphql` puts on Nest's
 * `InitializeOnPreviewAllowlist` precisely so the schema can be built in
 * preview. Its `onModuleInit` runs the same `GraphQLSchemaBuilder` a real boot
 * does and writes the same file, byte for byte, then returns before starting
 * Apollo because an application context has no HTTP adapter.
 *
 * Nothing about the output is re-implemented here, which is the point: the file
 * cannot drift from what a boot writes, because a boot's own code writes it.
 * Point the module's `autoSchemaFile` somewhere else first to compare rather
 * than overwrite.
 *
 * Any environment the module graph reads at **import** time must already be
 * set; preview mode does not change what importing the module evaluates.
 *
 * @public
 */
export async function emitCodeFirstSchema(
  rootModule: DynamicModule | Type,
): Promise<void> {
  const context = await NestFactory.createApplicationContext(rootModule, {
    abortOnError: false,
    logger: false,
    preview: true,
  });

  await context.close();
}
