import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { Note } from './note.entity';
import { NotesService } from './notes.service';

@Module({
  controllers: [],
  exports: [NotesService],
  imports: [LoggerModule, TypeOrmModule.forFeature([Note])],
  providers: [NotesService],
})
export class NotesModule {}
