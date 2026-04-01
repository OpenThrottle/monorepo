/**
 * @description GraphQL module that registers NotesResolver and imports NestjsRepositoriesModule for NotesService.
 */

import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { Module } from '@nestjs/common';
import { NotesResolver } from './notes.resolver';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [NotesResolver],
})
export class NotesGraphqlModule {}
