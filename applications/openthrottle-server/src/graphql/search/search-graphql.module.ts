/**
 * @description GraphQL module for semantic search over plan/task embeddings. Registers SearchResolver.
 */

import { Module } from '@nestjs/common';
import { SearchResolver } from './search.resolver';

@Module({
  providers: [SearchResolver],
})
export class SearchGraphqlModule {}
