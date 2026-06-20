import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { AppConfigService } from './app-config.service';
import { CodeSearchService } from './code-search.service';
import { CodeSnapshotStore } from './code-snapshot-store';
import { CodeVectorStore } from './code-vector-store';

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
