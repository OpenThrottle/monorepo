import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkSession } from './work-session.entity.ts';
import { WORK_SESSION_CLOSED_BY } from './work-sessions.constants.ts';
import { workSessionsFactory } from './work-sessions.factory.ts';
import { WorkSessionsRepository } from './work-sessions.repository.ts';

describe('WorkSessionsRepository', () => {
  let repository: WorkSessionsRepository;
  const findOne = vi.fn();
  const save = vi.fn();
  const endedAt = new Date('2026-11-18T00:00:00Z');

  beforeEach(async () => {
    vi.clearAllMocks();
    save.mockImplementation(async (session: unknown) => {
      return session;
    });
    const app = await Test.createTestingModule({
      providers: [
        WorkSessionsRepository,
        {
          provide: getRepositoryToken(WorkSession),
          useValue: createMock<Repository<WorkSession>>({
            findOne,
            save,
            target: WorkSession,
          }),
        },
      ],
    }).compile();
    repository = app.get(WorkSessionsRepository);
  });

  describe('close', () => {
    describe('when no session has the id', () => {
      it('returns null without saving', async () => {
        findOne.mockResolvedValue(null);

        await expect(
          repository.close('missing', {
            closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
            endedAt,
            summary: null,
          }),
        ).resolves.toBeNull();
        expect(save).not.toHaveBeenCalled();
      });
    });

    describe('when the session is open', () => {
      it('stamps endedAt, closedBy and the summary', async () => {
        findOne.mockResolvedValue(
          workSessionsFactory.build({ closedBy: null, endedAt: null }),
        );

        const closed = await repository.close('session-1', {
          closedBy: WORK_SESSION_CLOSED_BY.SWEEPER,
          endedAt,
          summary: 'done',
        });

        expect(findOne).toHaveBeenCalledWith({ where: { id: 'session-1' } });
        expect(closed).toMatchObject({
          closedBy: WORK_SESSION_CLOSED_BY.SWEEPER,
          endedAt,
          summary: 'done',
        });
      });
    });

    describe('when the session is already closed', () => {
      it('keeps endedAt and closedBy but applies a summary', async () => {
        const original = new Date('2026-11-01T00:00:00Z');
        findOne.mockResolvedValue(
          workSessionsFactory.build({
            closedBy: WORK_SESSION_CLOSED_BY.SWEEPER,
            endedAt: original,
            summary: null,
          }),
        );

        const closed = await repository.close('session-1', {
          closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
          endedAt,
          summary: 'late summary',
        });

        expect(closed).toMatchObject({
          closedBy: WORK_SESSION_CLOSED_BY.SWEEPER,
          endedAt: original,
          summary: 'late summary',
        });
      });

      it('keeps an existing summary when none is given', async () => {
        findOne.mockResolvedValue(
          workSessionsFactory.build({ summary: 'kept' }),
        );

        const closed = await repository.close('session-1', {
          closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
          endedAt,
          summary: null,
        });

        expect(closed?.summary).toBe('kept');
      });
    });
  });
});
