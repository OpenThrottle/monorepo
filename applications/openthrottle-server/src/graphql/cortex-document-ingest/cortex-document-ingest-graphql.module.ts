/**
 * @description GraphQL module for Cortex document ingest preview and commit mutations.
 */

import { Module } from '@nestjs/common';
import { CortexDocumentIngestModule } from '../../services/cortex-document-ingest/cortex-document-ingest.module';
import { CortexDocumentIngestResolver } from './cortex-document-ingest.resolver';

@Module({
  imports: [CortexDocumentIngestModule],
  providers: [CortexDocumentIngestResolver],
})
export class CortexDocumentIngestGraphqlModule {}
