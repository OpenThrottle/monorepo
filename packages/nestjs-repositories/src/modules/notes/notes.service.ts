import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { Note } from './note.entity';

@Injectable()
export class NotesService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(Note)
    private readonly noteRepository: Repository<Note>,
  ) {
    this.logger.debug('🧩 notes 🧩');
  }

  /**
   * @description Returns the TypeORM repository for notes. Use for CRUD and queries.
   */
  getRepository(): Repository<Note> {
    return this.noteRepository;
  }
}
