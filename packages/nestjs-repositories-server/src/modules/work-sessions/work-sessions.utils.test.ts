import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { WORK_SESSION_CLOSED_BY } from './work-sessions.constants.ts';
import { createWorkSessionsRepositoryMock } from './work-sessions.utils.ts';

describe('createWorkSessionsRepositoryMock', () => {
  it('starts as an empty work_sessions table', async () => {
    const repository = createWorkSessionsRepositoryMock();

    await expect(
      repository.close('a', {
        closedBy: WORK_SESSION_CLOSED_BY.EXPLICIT,
        endedAt: new Date('2026-11-18T00:00:00Z'),
        summary: null,
      }),
    ).resolves.toBeNull();
    await expect(repository.findBy()).resolves.toEqual([]);
  });

  it('names the work_sessions table in inherited not-found errors', async () => {
    const repository = createWorkSessionsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'work_sessions record with ID "a" not found',
    );
  });
});
