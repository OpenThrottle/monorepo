import { PGVectorStore } from '@langchain/community/dist/vectorstores/pgvector';
import type { DistanceStrategy } from '@langchain/community/dist/vectorstores/pgvector';
import type { PoolConfig } from 'pg';
import { getEmbeddingModal } from './models';
import type { Model } from './models';

/**
 * @external https://js.langchain.com/docs/integrations/vectorstores/pgvector/
 */
export async function getVectorStore(model: Model) {
  const embeddingModel = getEmbeddingModal({ model });

  const store = new PGVectorStore(embeddingModel, {
    chunkSize: 1500,
    // collectionMetadata: {},
    // collectionName: "__TO_BE_DETERMINED__",
    // collectionTableName: "__TO_BE_DETERMINED__",

    // FIXME: Swap out eventually
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    distanceStrategy: 'cosine' as DistanceStrategy, // supported distance strategies: cosine (default), innerProduct, or euclidean
    // filter: {},

    // FIXME: Swap out eventually
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    postgresConnectionOptions: {
      columns: {
        contentColumnName: 'content',
        idColumnName: 'id',
        metadataColumnName: 'metadata',
        vectorColumnName: 'embedding',
      },
      database: process.env.POSTGRES_DB,
      host: process.env.POSTGRES_HOST,
      password: `${process.env.POSTGRES_PASSWORD}`,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      type: 'postgres',
      user: process.env.POSTGRES_USER,
    } as PoolConfig,
    // schemaName: "public",
    tableName: `documents_${model}`,
    verbose: true,
  });

  return store;
}
