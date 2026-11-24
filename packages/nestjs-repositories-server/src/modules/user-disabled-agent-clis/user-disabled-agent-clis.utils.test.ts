import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { createUserDisabledAgentClisRepositoryMock } from './user-disabled-agent-clis.utils.ts';

const userId = '11111111-1111-4111-8111-111111111111';

describe('createUserDisabledAgentClisRepositoryMock', () => {
  it('starts as an empty table, so everything reads as enabled', async () => {
    const repository = createUserDisabledAgentClisRepositoryMock();

    await expect(repository.getDisabledDrivers(userId)).resolves.toEqual(
      new Set(),
    );
    await expect(repository.getDisabledModels(userId)).resolves.toEqual(
      new Map(),
    );
    await expect(repository.isEnabled(userId, 'claude')).resolves.toBe(true);
    await expect(
      repository.isModelEnabled(userId, 'claude', 'opus'),
    ).resolves.toBe(true);
  });

  it('names the user_disabled_agent_clis table in inherited not-found errors', async () => {
    const repository = createUserDisabledAgentClisRepositoryMock();

    await expect(repository.findById('a')).rejects.toThrow(NotFoundException);
    await expect(repository.findById('a')).rejects.toThrow(
      'user_disabled_agent_clis record with ID "a" not found',
    );
  });
});
