import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { SkillUsageEvent } from './skill-usage-event.entity.ts';
import type { SkillUsageEventsRepositoryMock } from './skill-usage-events.types.ts';

const notStubbed = (method: string): Promise<never> => {
  return Promise.reject(
    new Error(`skill_usage_events.${method} is not stubbed in this test`),
  );
};

/**
 * @description Builds a {@link SkillUsageEventsRepositoryMock} that starts as an empty
 * `skill_usage_events` table (see `createBaseRepositoryMock`): the list reads return `[]`,
 * `countInRange` is 0, `getUsageAggregation` an empty aggregation and `searchGitBranches`
 * an empty page. `recordSkillUsage` rejects until a test stubs it, since an invented
 * row would hide a missing stub. Provide it in place of `SkillUsageEventsRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createSkillUsageEventsRepositoryMock(): SkillUsageEventsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      SkillUsageEvent,
      CreateModelInput<SkillUsageEvent>
    >('skill_usage_events'),
    countInRange: vi.fn(async () => {
      return 0;
    }),
    getUsageAggregation: vi.fn(async () => {
      return {
        byDay: [],
        byScope: [],
        bySkill: [],
        filterOptions: { cwds: [], gitBranches: [], repoIdentities: [] },
        totalCount: 0,
      };
    }),
    listByDay: vi.fn(async () => {
      return [];
    }),
    listByScope: vi.fn(async () => {
      return [];
    }),
    listBySkill: vi.fn(async () => {
      return [];
    }),
    listCaptureHealth: vi.fn(async () => {
      return [];
    }),
    listFilterOptions: vi.fn(async () => {
      return { cwds: [], gitBranches: [], repoIdentities: [] };
    }),
    recordSkillUsage: vi.fn(() => {
      return notStubbed('recordSkillUsage');
    }),
    searchGitBranches: vi.fn(async () => {
      return { hasMore: false, items: [] };
    }),
  };
}
