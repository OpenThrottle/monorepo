import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { AppConfigService } from './app-config/app-config.service.ts';
import { CodeSearchService } from './code-search/code-search.service.ts';
import { CodeSnapshotStore } from './code-snapshot-store/code-snapshot-store.service.ts';
import { CodeVectorStore } from './code-vector-store/code-vector-store.service.ts';

/**
 * @description Server-side code semantic search. Provides the {@link AppConfigService} embeddings
 * resolver, the pgvector {@link CodeVectorStore}, the {@link CodeSnapshotStore} (incremental-index
 * baseline), and the {@link CodeSearchService} orchestration over the openthrottle-ide engine.
 * Requires the host app to configure a TypeORM root (the default DataSource is injected into the
 * stores) — e.g. NestjsRepositoriesModule in openthrottle-server.
 */
@Module({
  controllers: [],
  exports: [
    AppConfigService,
    CodeSearchService,
    CodeSnapshotStore,
    CodeVectorStore,
  ],
  imports: [LoggerModule],
  providers: [
    AppConfigService,
    CodeSearchService,
    CodeSnapshotStore,
    CodeVectorStore,
  ],
})
export class NestjsVectorSearchModule {}
