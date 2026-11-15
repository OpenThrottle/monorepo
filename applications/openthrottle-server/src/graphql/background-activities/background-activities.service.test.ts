/**
 * @description Unit tests for BackgroundActivitiesService: it maps registry snapshots onto the
 * GraphQL object unchanged.
 */

import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it, vi } from 'vitest';

import type { BackgroundActivityRegistryService } from '../../services/background-activity-registry/background-activity-registry.service.ts';
import type { BackgroundActivitySnapshot } from '../../services/background-activity-registry/background-activity-registry.types.ts';
import { BackgroundActivitiesService } from './background-activities.service.ts';

const SNAPSHOT: BackgroundActivitySnapshot = {
  done: 40,
  etaSeconds: 60,
  id: 'embeddings_backfill:code',
  kind: 'embeddings_backfill',
  label: 'Re-embedding code chunks',
  startedAt: new Date('2026-11-15T18:00:00.000Z'),
  status: 'running',
  total: 100,
};

const serviceWith = (
  snapshots: readonly BackgroundActivitySnapshot[],
): BackgroundActivitiesService => {
  const registry = asMock<BackgroundActivityRegistryService>({
    list: vi.fn(async () => {
      return [...snapshots];
    }),
  });

  return new BackgroundActivitiesService(registry);
};

describe('BackgroundActivitiesService', () => {
  it('returns an empty list when the server is idle', async () => {
    await expect(serviceWith([]).findAll()).resolves.toEqual([]);
  });

  it('maps each registry snapshot onto the GraphQL object', async () => {
    await expect(serviceWith([SNAPSHOT]).findAll()).resolves.toEqual([
      SNAPSHOT,
    ]);
  });
});
