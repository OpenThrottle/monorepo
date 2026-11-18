import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, expect, it, vi } from 'vitest';

import { SKILL_USAGE_SCOPES } from '../skill-usage-events/skill-usage-events.constants.ts';
import { SkillUsageOutcome } from './skill-usage-outcome.entity.ts';
import {
  SKILL_USAGE_CAPTURE_MODELS,
  SKILL_USAGE_OUTCOMES,
} from './skill-usage-outcomes.constants.ts';
import { SkillUsageOutcomesRepository } from './skill-usage-outcomes.repository.ts';
import type { SkillUsageOutcomeValue } from './skill-usage-outcomes.types.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('SkillUsageOutcomesRepository', () => {
  const buildRepository = async (mockRepo: {
    create?: ReturnType<typeof vi.fn>;
    save?: ReturnType<typeof vi.fn>;
  }): Promise<SkillUsageOutcomesRepository> => {
    const app = await Test.createTestingModule({
      providers: [
        SkillUsageOutcomesRepository,
        {
          provide: getRepositoryToken(SkillUsageOutcome),
          useValue: {
            create: vi.fn(),
            save: vi.fn(),
            target: SkillUsageOutcome,
            ...mockRepo,
          },
        },
      ],
    }).compile();

    return app.get<SkillUsageOutcomesRepository>(SkillUsageOutcomesRepository);
  };

  describe('recordSkillUsageOutcome', () => {
    it('maps outcome + duration and defaults scope to ours', async () => {
      const create = vi.fn((input: Partial<SkillUsageOutcome>) => input);
      const save = vi.fn((row: Partial<SkillUsageOutcome>) =>
        Promise.resolve({
          ...row,
          id: 'outcome-1',
          receivedAt: new Date(FIXED_NOW),
        }),
      );
      const repository = await buildRepository({ create, save });
      const occurredAt = new Date('2026-07-31T12:05:00.000Z');

      const saved = await repository.recordSkillUsageOutcome({
        cwd: '/repo',
        durationMs: 4200,
        gitBranch: 'example-usage-tracking',
        occurredAt,
        outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        source: 'claude-code',
        toolUseId: 'tool-1',
      });

      expect(create).toHaveBeenCalledWith({
        captureModel: SKILL_USAGE_CAPTURE_MODELS.LEGACY_ASSUMED_SUCCESS,
        cwd: '/repo',
        durationMs: 4200,
        gitBranch: 'example-usage-tracking',
        occurredAt,
        outcome: SKILL_USAGE_OUTCOMES.SUCCESS,
        scope: SKILL_USAGE_SCOPES.OURS,
        sessionId: 'session-1',
        skillName: 'ot-plans',
        source: 'claude-code',
        toolUseId: 'tool-1',
      });
      expect(saved.id).toBe('outcome-1');
    });

    describe('when durationMs and sessionId are omitted', () => {
      it('nulls optional correlation/duration fields', async () => {
        const create = vi.fn((input: Partial<SkillUsageOutcome>) => input);
        const save = vi.fn((row: Partial<SkillUsageOutcome>) =>
          Promise.resolve({
            ...row,
            id: 'outcome-2',
            receivedAt: new Date(FIXED_NOW),
          }),
        );
        const repository = await buildRepository({ create, save });
        const occurredAt = new Date('2026-07-31T12:06:00.000Z');

        await repository.recordSkillUsageOutcome({
          occurredAt,
          outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
          skillName: 'ot-plans',
        });

        expect(create).toHaveBeenCalledWith({
          captureModel: SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1,
          cwd: null,
          durationMs: null,
          gitBranch: null,
          occurredAt,
          outcome: SKILL_USAGE_OUTCOMES.ABANDONED,
          scope: SKILL_USAGE_SCOPES.OURS,
          sessionId: null,
          skillName: 'ot-plans',
          source: null,
          toolUseId: null,
        });
      });
    });
  });

  describe('recordSkillUsageOutcome capture model', () => {
    const record = async (
      outcome: SkillUsageOutcomeValue,
      deliberate: boolean | undefined,
    ): Promise<unknown> => {
      const create = vi.fn((input: Partial<SkillUsageOutcome>) => input);
      const save = vi.fn((row: Partial<SkillUsageOutcome>) =>
        Promise.resolve({
          ...row,
          id: 'outcome-1',
          receivedAt: new Date(FIXED_NOW),
        }),
      );
      const repository = await buildRepository({ create, save });
      await repository.recordSkillUsageOutcome({
        deliberate,
        occurredAt: new Date('2026-07-31T12:06:00.000Z'),
        outcome,
        skillName: 'ot-plans',
      });
      return create.mock.calls[0]?.[0].captureModel;
    };

    it.each([SKILL_USAGE_OUTCOMES.SUCCESS, SKILL_USAGE_OUTCOMES.ERROR])(
      'stores undeclared %s as legacy_assumed_success',
      async (outcome) => {
        expect(await record(outcome, undefined)).toBe(
          SKILL_USAGE_CAPTURE_MODELS.LEGACY_ASSUMED_SUCCESS,
        );
        expect(await record(outcome, false)).toBe(
          SKILL_USAGE_CAPTURE_MODELS.LEGACY_ASSUMED_SUCCESS,
        );
      },
    );

    it.each([SKILL_USAGE_OUTCOMES.SUCCESS, SKILL_USAGE_OUTCOMES.ERROR])(
      'stores declared %s as reported_v1',
      async (outcome) => {
        expect(await record(outcome, true)).toBe(
          SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1,
        );
      },
    );

    it.each([
      SKILL_USAGE_OUTCOMES.SESSION_ENDED,
      SKILL_USAGE_OUTCOMES.ABANDONED,
    ])('keeps %s as reported_v1 without a declaration', async (outcome) => {
      expect(await record(outcome, undefined)).toBe(
        SKILL_USAGE_CAPTURE_MODELS.REPORTED_V1,
      );
    });
  });
});
