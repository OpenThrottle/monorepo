import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Note } from './note.entity.ts';
import { NotesRepository } from './notes.repository.ts';

/**
 * @description Registers {@link Note} on the default connection and provides
 * {@link NotesRepository}.
 * @public
 */
@Module({
  exports: [NotesRepository],
  imports: [TypeOrmModule.forFeature([Note])],
  providers: [NotesRepository],
})
export class NotesModule {}
