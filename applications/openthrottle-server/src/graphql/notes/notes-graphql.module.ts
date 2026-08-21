/**
 * @description GraphQL module that registers NotesResolver, importing NestjsRepositoriesModule for NotesService and GlobalClsModule for the request identity used to stamp note authorship.
 */

import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { NotesResolver } from './notes.resolver';

@Module({
  imports: [GlobalClsModule, NestjsRepositoriesModule],
  providers: [NotesResolver],
})
export class NotesGraphqlModule {}
