import { Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PLAN_SCHEDULE_CONFLICT_CODE } from './plan-enqueue.constants.ts';
import { createPlanScheduleConflictError } from './plan-enqueue.utils.ts';
import { PlanScheduleConflictFilter } from './plan-schedule-conflict.filter.ts';

describe('PlanScheduleConflictFilter', () => {
  let filter: PlanScheduleConflictFilter;
  let warn: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filter = new PlanScheduleConflictFilter();
    warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when the error is a schedule conflict', () => {
    test.each(Object.values(PLAN_SCHEDULE_CONFLICT_CODE))(
      '%s logs one warn line without a stack and rethrows unchanged',
      (code) => {
        const conflict = createPlanScheduleConflictError({
          code,
          message: 'Plan already has a scheduled run',
          planRunId: null,
          scheduledFor: null,
        });

        expect(() => filter.catch(conflict)).toThrow(conflict);

        expect(error).not.toHaveBeenCalled();
        expect(warn).toHaveBeenCalledExactlyOnceWith(
          `${code}: Plan already has a scheduled run`,
        );
      },
    );
  });

  describe('when the error is any other GraphQLError', () => {
    test('logs at error with the error itself, as Nest does, and rethrows', () => {
      const other = new GraphQLError('Forbidden resource', {
        extensions: { code: 'FORBIDDEN' },
      });

      expect(() => filter.catch(other)).toThrow(other);

      expect(warn).not.toHaveBeenCalled();
      expect(error).toHaveBeenCalledExactlyOnceWith(other);
    });
  });
});
