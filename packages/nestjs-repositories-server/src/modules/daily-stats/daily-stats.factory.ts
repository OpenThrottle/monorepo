/**
 * @description Fishery factory for {@link DailyStat}. Use in tests to build mock daily stats.
 */

import { faker } from '@faker-js/faker';
import { Factory } from 'fishery';

import type { DailyStat } from './daily-stat.entity.ts';

/**
 * @description Column-only shape for building `daily_stats` test data.
 * @public
 */
export type DailyStatFactoryData = Pick<
  DailyStat,
  | 'createdAt'
  | 'date'
  | 'id'
  | 'plansByStatus'
  | 'plansCompleted'
  | 'plansCreated'
  | 'plansUpdated'
  | 'tasksByStatus'
  | 'tasksCompleted'
  | 'tasksCreated'
  | 'tasksUpdated'
>;

/**
 * @description Builds DailyStat-shaped plain objects. Override any field via
 * `.build({ ... })`.
 * @public
 */
export const dailyStatsFactory = Factory.define<DailyStatFactoryData>(() => ({
  createdAt: faker.date.past(),
  date: faker.date.recent(),
  id: faker.string.uuid(),
  plansByStatus: { completed: 1, pending: 2 },
  plansCompleted: 1,
  plansCreated: 2,
  plansUpdated: 1,
  tasksByStatus: { completed: 3, in_progress: 1 },
  tasksCompleted: 3,
  tasksCreated: 4,
  tasksUpdated: 2,
}));
