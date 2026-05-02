import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { CommitLink } from './commit-link.entity';

@Injectable()
export class CommitLinksService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(CommitLink)
    private readonly commitLinkRepository: Repository<CommitLink>,
  ) {
    this.logger.debug('🧩 commit-links 🧩');
  }

  /**
   * @description Returns the TypeORM repository for commit_links. Use for CRUD and queries.
   */
  getRepository(): Repository<CommitLink> {
    return this.commitLinkRepository;
  }
}
