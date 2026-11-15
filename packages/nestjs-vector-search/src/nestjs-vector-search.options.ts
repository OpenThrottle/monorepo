import type { ModuleMetadata, Type } from '@nestjs/common';

import type { CodeEmbedder } from './code-embedder/code-embedder.types.ts';

/**
 * @description Options for `NestjsVectorSearchModule.register`: the host's embedder class and the
 * modules that provide (export) it.
 *
 * @public
 */
export interface NestjsVectorSearchOptions {
  readonly embedder: Type<CodeEmbedder>;
  readonly imports: NonNullable<ModuleMetadata['imports']>;
}
