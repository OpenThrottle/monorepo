import { createMock } from '@golevelup/ts-vitest';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PlanOutputStreamLoaders } from './plan-output-stream-loaders';

describe('PlanOutputStreamLoaders', () => {
  const findPlans = vi.fn();
  const plansService = createMock<PlansService>({
    getRepository: vi.fn().mockReturnValue({ find: findPlans }),
  });

  let loaders: PlanOutputStreamLoaders;

  beforeEach(() => {
    vi.clearAllMocks();
    loaders = new PlanOutputStreamLoaders(plansService);
  });

  test('planLoader batches many load() calls into one find and maps to key order', async () => {
    findPlans.mockResolvedValue([
      { id: 'p2', title: 'Two' },
      { id: 'p1', title: 'One' },
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
