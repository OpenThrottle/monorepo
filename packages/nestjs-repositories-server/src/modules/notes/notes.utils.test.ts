import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createNotesRepositoryMock } from './notes.utils.ts';

describe('createNotesRepositoryMock', () => {
  it('starts with no notes', async () => {
    const repository = createNotesRepositoryMock();

    await expect(repository.findAllNewestFirst()).resolves.toEqual([]);
    await expect(repository.findOne({ where: {} })).resolves.toBeNull();
  });

  it('names the notes table in inherited not-found errors', async () => {
    const repository = createNotesRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'notes record with ID "a" not found',
    );
  });

  it('builds independent mocks', () => {
    const first = createNotesRepositoryMock();
    const second = createNotesRepositoryMock();

    expect(first.findAllNewestFirst).not.toBe(second.findAllNewestFirst);
  });
});
