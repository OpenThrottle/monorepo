import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { Note } from './note.entity.ts';
import { NotesService } from './notes.service.ts';

@Module({
  controllers: [],
  exports: [NotesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Note])],
  providers: [NotesService],
})
export class NotesModule {}
