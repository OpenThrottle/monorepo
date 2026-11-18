import type { PlansRepository } from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  plansFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { PlanOutputStreamLoaders } from './loaders.service.ts';

describe('PlanOutputStreamLoaders', () => {
  const plansRepository = createPlansRepositoryMock();
  const findPlans = plansRepository.findBy;

  let loaders: PlanOutputStreamLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new PlanOutputStreamLoaders(
      asMock<PlansRepository>(plansRepository),
    );
  });

  test('planLoader batches many load() calls into one find and maps to key order', async () => {
    findPlans.mockResolvedValue([
      plansFactory.build({ id: 'p2', title: 'Two' }),
      plansFactory.build({ id: 'p1', title: 'One' }),
    ]);

    const [a, b, missing] = await Promise.all([
      loaders.planLoader.load('p1'),
      loaders.planLoader.load('p2'),
      loaders.planLoader.load('p3'),
    ]);

    expect(findPlans).toHaveBeenCalledTimes(1);
    expect(a?.id).toBe('p1');
    expect(b?.id).toBe('p2');
    expect(missing).toBeNull();
  });
});
