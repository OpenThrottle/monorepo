import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { CODE_EMBEDDER } from './code-embedder/code-embedder.token.ts';
import { CodeSearchService } from './code-search/code-search.service.ts';
import { CodeSnapshotStore } from './code-snapshot-store/code-snapshot-store.service.ts';
import { CodeVectorStore } from './code-vector-store/code-vector-store.service.ts';
import type { NestjsVectorSearchOptions } from './nestjs-vector-search.options.ts';

/**
 * @description Server-side code semantic search. Provides the pgvector {@link CodeVectorStore},
 * the {@link CodeSnapshotStore} (incremental-index baseline) and the {@link CodeSearchService}
 * orchestration over the openthrottle-ide engine. It embeds nothing itself: `register` binds
 * the host's embedder to {@link CODE_EMBEDDER}. Requires the host app to configure a TypeORM root
 * (the default DataSource is injected into the stores) — e.g. NestjsRepositoriesModule in
 * openthrottle-server.
 */
@Module({})
export class NestjsVectorSearchModule {
  static register(options: NestjsVectorSearchOptions): DynamicModule {
    return {
      exports: [CodeSearchService, CodeSnapshotStore, CodeVectorStore],
      imports: [LoggerModule, ...options.imports],
      module: NestjsVectorSearchModule,
      providers: [
        { provide: CODE_EMBEDDER, useExisting: options.embedder },
        CodeSearchService,
        CodeSnapshotStore,
        CodeVectorStore,
      ],
    };
  }
}
