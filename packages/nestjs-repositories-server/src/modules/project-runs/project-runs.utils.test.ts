import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createProjectRunsRepositoryMock } from './project-runs.utils.ts';

describe('createProjectRunsRepositoryMock', () => {
  it('starts with no runs and loses every transition', async () => {
    const repository = createProjectRunsRepositoryMock();

    await expect(repository.findActive()).resolves.toEqual([]);
    await expect(repository.findActiveByProjectId('p')).resolves.toBeNull();
    await expect(repository.findRunById('r')).resolves.toBeNull();
    await expect(repository.findLatestByProjectIds(['p'])).resolves.toEqual(
      new Map(),
    );
    await expect(repository.setCurrentPlan('r', 'plan')).resolves.toBe(false);
    await expect(repository.settleStopped('r', 'plan', 'why')).resolves.toBe(
      false,
    );
    await expect(repository.settleCompleted('r')).resolves.toBe(false);
    await expect(repository.settleCancelled('r')).resolves.toBe(false);
    await expect(repository.stampCancelRequested('r', null)).resolves.toBe(
      false,
    );
  });

  it('names the project_runs table in inherited not-found errors', async () => {
    const repository = createProjectRunsRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'project_runs record with ID "a" not found',
    );
  });
});
