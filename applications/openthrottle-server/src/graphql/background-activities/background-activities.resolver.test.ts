/**
 * @description Unit tests for BackgroundActivitiesResolver: the query delegates to the service.
 */

import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it, vi } from 'vitest';

import { BackgroundActivitiesResolver } from './background-activities.resolver.ts';
import type { BackgroundActivitiesService } from './background-activities.service.ts';

describe('BackgroundActivitiesResolver', () => {
  it('serves the service list from backgroundActivities', async () => {
    const findAll = vi.fn(async () => {
      return [];
    });
    const resolver = new BackgroundActivitiesResolver(
      asMock<BackgroundActivitiesService>({ findAll }),
    );

    await expect(resolver.backgroundActivities()).resolves.toEqual([]);
    expect(findAll).toHaveBeenCalledOnce();
  });
});
