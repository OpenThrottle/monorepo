import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { CodeSearchService } from './code-search.service';
import { CodeVectorStore } from './code-vector-store';

/**
 * @description Server-side code semantic search. Provides the pgvector {@link CodeVectorStore} and the
 * {@link CodeSearchService} orchestration over the openthrottle-ide engine. Requires the host app to
 * configure a TypeORM root (the default DataSource is injected into CodeVectorStore) — e.g.
 * NestjsRepositoriesModule in openthrottle-server.
 */
@Module({
  controllers: [],
  exports: [CodeSearchService, CodeVectorStore],
  imports: [LoggerModule],
  providers: [CodeSearchService, CodeVectorStore],
})
export class NestjsVectorSearchModule {}
