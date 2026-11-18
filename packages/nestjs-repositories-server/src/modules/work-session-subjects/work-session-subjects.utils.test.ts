import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createWorkSessionSubjectsRepositoryMock } from './work-session-subjects.utils.ts';

describe('createWorkSessionSubjectsRepositoryMock', () => {
  it('starts as an empty work_session_subjects table', async () => {
    const repository = createWorkSessionSubjectsRepositoryMock();

    await expect(repository.findBy()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the work_session_subjects table in inherited not-found errors', async () => {
    const repository = createWorkSessionSubjectsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'work_session_subjects record with ID "a" not found',
    );
  });
});
