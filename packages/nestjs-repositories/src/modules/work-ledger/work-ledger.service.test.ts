import { describe, it, expect, beforeAll } from 'vitest';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { WorkArtifact } from './work-artifact.entity';
import { WorkSessionSubject } from './work-session-subject.entity';
import { WorkSession } from './work-session.entity';
import {
  workArtifactsFactory,
  workSessionSubjectsFactory,
  workSessionsFactory,
} from './work-ledger.factory';
import { WorkLedgerService } from './work-ledger.service';

describe('WorkLedgerService', () => {
  let service: WorkLedgerService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        WorkLedgerService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: getRepositoryToken(WorkSession),
          useValue: createMock<
            ReturnType<WorkLedgerService['getSessionRepository']>
          >({
            find: () => Promise.resolve([workSessionsFactory.build()]),
          }),
        },
        {
          provide: getRepositoryToken(WorkSessionSubject),
          useValue: createMock<
            ReturnType<WorkLedgerService['getSubjectRepository']>
          >({
            find: () => Promise.resolve([workSessionSubjectsFactory.build()]),
          }),
        },
        {
          provide: getRepositoryToken(WorkArtifact),
          useValue: createMock<
            ReturnType<WorkLedgerService['getArtifactRepository']>
          >({
            find: () => Promise.resolve([workArtifactsFactory.build()]),
          }),
        },
      ],
    }).compile();

    service = app.get<WorkLedgerService>(WorkLedgerService);
  });

  it('exposes the three work-ledger repositories', () => {
    expect(service.getSessionRepository().find).toBeDefined();
    expect(service.getSubjectRepository().find).toBeDefined();
    expect(service.getArtifactRepository().find).toBeDefined();
  });

  it('builds a session with exactly one actor (single-actor invariant)', () => {
    const session = workSessionsFactory.build();
    const actorCount = [
      session.actorUserId,
      session.actorServiceAccountId,
    ].filter((value) => value != null).length;

    expect(actorCount).toBe(1);
  });

  it('defaults an artifact to an unverified git_commit claim', async () => {
    const [artifact] = await service.getArtifactRepository().find();

    expect(artifact).toMatchObject({
      type: 'git_commit',
      verification: 'unverified',
    });
  });
});
