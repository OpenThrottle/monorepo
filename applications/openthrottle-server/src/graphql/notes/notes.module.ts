/**
 * @description GraphQL module that registers NotesResolver, importing NotesModule from @openthrottle/nestjs-repositories-server for NotesRepository and GlobalClsModule for the request identity used to stamp note authorship.
 */

import { Module } from '@nestjs/common';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { NotesModule } from '@openthrottle/nestjs-repositories-server';

import { NotesResolver } from './notes.resolver.ts';

@Module({
  imports: [GlobalClsModule, NotesModule],
  providers: [NotesResolver],
})
export class NotesGraphqlModule {}
