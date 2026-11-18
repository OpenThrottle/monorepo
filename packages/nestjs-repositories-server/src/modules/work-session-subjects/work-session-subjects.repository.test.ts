import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkSessionSubject } from './work-session-subject.entity.ts';
import { workSessionSubjectsFactory } from './work-session-subjects.factory.ts';
import { WorkSessionSubjectsRepository } from './work-session-subjects.repository.ts';

describe('WorkSessionSubjectsRepository', () => {
  let repository: WorkSessionSubjectsRepository;
  const find = vi.fn();
  const remove = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        WorkSessionSubjectsRepository,
        {
          provide: getRepositoryToken(WorkSessionSubject),
          useValue: createMock<Repository<WorkSessionSubject>>({
            find,
            remove,
            target: WorkSessionSubject,
          }),
        },
      ],
    }).compile();
    repository = app.get(WorkSessionSubjectsRepository);
  });

  it('reads without a soft-delete filter, since the table hard deletes', async () => {
    const subject = workSessionSubjectsFactory.build();
    find.mockResolvedValue([subject]);

    await expect(
      repository.findBy({ where: { sessionId: subject.sessionId } }),
    ).resolves.toEqual([subject]);
    expect(find).toHaveBeenCalledWith({
      where: { sessionId: subject.sessionId },
    });
  });
});
