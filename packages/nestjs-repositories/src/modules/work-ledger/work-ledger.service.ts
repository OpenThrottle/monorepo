import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Repository } from 'typeorm';
import { WorkArtifact } from './work-artifact.entity';
import { WorkSessionSubject } from './work-session-subject.entity';
import { WorkSession } from './work-session.entity';

@Injectable()
export class WorkLedgerService {
  constructor(
    private readonly logger: LoggerService,
    @InjectRepository(WorkSession)
    private readonly workSessionRepository: Repository<WorkSession>,
    @InjectRepository(WorkSessionSubject)
    private readonly workSessionSubjectRepository: Repository<WorkSessionSubject>,
    @InjectRepository(WorkArtifact)
    private readonly workArtifactRepository: Repository<WorkArtifact>,
  ) {
    this.logger.debug('🧩 work-ledger 🧩');
  }

  /**
   * @description Returns the TypeORM repository for work_artifacts. Use for CRUD and queries.
   */
  getArtifactRepository(): Repository<WorkArtifact> {
    return this.workArtifactRepository;
  }

  /**
   * @description Returns the TypeORM repository for work_sessions. Use for CRUD and queries.
   */
  getSessionRepository(): Repository<WorkSession> {
    return this.workSessionRepository;
  }

  /**
   * @description Returns the TypeORM repository for work_session_subjects. Use for CRUD and queries.
   */
  getSubjectRepository(): Repository<WorkSessionSubject> {
    return this.workSessionSubjectRepository;
  }
}
