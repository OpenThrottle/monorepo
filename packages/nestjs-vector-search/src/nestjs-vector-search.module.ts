import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsVectorSearchService } from './nestjs-vector-search.service';

@Module({
  controllers: [],
  exports: [NestjsVectorSearchService],
  imports: [LoggerModule],
  providers: [NestjsVectorSearchService],
})
export class NestjsVectorSearchModule {}
