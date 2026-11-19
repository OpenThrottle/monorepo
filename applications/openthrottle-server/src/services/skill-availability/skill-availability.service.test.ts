import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  SkillAvailabilityRule,
  SkillAvailabilityRuleSet,
} from '@openthrottle/nestjs-repositories-server';
import {
  SkillAvailabilityRuleSetsRepository,
  SkillAvailabilityRulesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createSkillAvailabilityRuleSetsRepositoryMock,
  createSkillAvailabilityRulesRepositoryMock,
  skillAvailabilityRuleSetsFactory,
  skillAvailabilityRulesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { SkillAvailabilityService } from './skill-availability.service.ts';

describe('SkillAvailabilityService', () => {
  const projectId = '22222222-2222-4222-8222-222222222222';
  const ruleSetId = '33333333-3333-4333-8333-333333333333';
  const knownTags = ['backend', 'github', 'infra'];

  const makeRuleSet = (
    overrides: Partial<SkillAvailabilityRuleSet> = {},
  ): SkillAvailabilityRuleSet => {
    return skillAvailabilityRuleSetsFactory.build({
      id: ruleSetId,
      projectId,
      ...overrides,
    });
  };

  const makeRule = (
    overrides: Partial<SkillAvailabilityRule> &
      Pick<SkillAvailabilityRule, 'id'>,
  ): SkillAvailabilityRule => {
    return skillAvailabilityRulesFactory.build({ ruleSetId, ...overrides });
  };

  const ruleRepository = createSkillAvailabilityRulesRepositoryMock();
  const ruleSetRepository = createSkillAvailabilityRuleSetsRepositoryMock();

  let service: SkillAvailabilityService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        { provide: SkillAvailabilityRulesRepository, useValue: ruleRepository },
        {
          provide: SkillAvailabilityRuleSetsRepository,
          useValue: ruleSetRepository,
        },
      ],
    }).compile();

    service = app.get(SkillAvailabilityService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ruleRepository.create.mockImplementation(async (data) => {
      return skillAvailabilityRulesFactory.build(data);
    });
    ruleRepository.findRuleById.mockResolvedValue(null);
    ruleRepository.listByRuleSetId.mockResolvedValue([]);
    ruleRepository.removeRule.mockResolvedValue(false);
    ruleRepository.update.mockImplementation(async (id, input) => {
      return skillAvailabilityRulesFactory.build({ id, ...input });
    });
    ruleSetRepository.ensureForProject.mockResolvedValue(makeRuleSet());
    ruleSetRepository.findByProjectId.mockResolvedValue(null);
    ruleSetRepository.removeForProject.mockResolvedValue(false);
    ruleSetRepository.upsertPosture.mockImplementation(async (id, posture) => {
      return makeRuleSet({ posture, projectId: id });
    });
  });

  describe('getRuleSetForProject', () => {
    it('returns undefined when the project has no rule set (passthrough)', async () => {
      await expect(
        service.getRuleSetForProject(projectId),
      ).resolves.toBeUndefined();
      expect(ruleRepository.listByRuleSetId).not.toHaveBeenCalled();
    });

    it('maps stored rows EXACTLY onto the resolver rule-set shape', async () => {
      ruleSetRepository.findByProjectId.mockResolvedValue(
        makeRuleSet({ posture: 'deny' }),
      );
      ruleRepository.listByRuleSetId.mockResolvedValue([
        makeRule({
          environment: 'ralph',
          id: 'rule-1',
          slugAllow: ['git-commit'],
          tagDeny: ['github'],
        }),
        makeRule({ environment: null, id: 'rule-2', tagAllow: ['infra'] }),
      ]);

      const result = await service.getRuleSetForProject(projectId);

      expect(result).toEqual({
        posture: 'deny',
        rules: [
          {
            environment: 'ralph',
            id: 'rule-1',
            slugAllow: ['git-commit'],
            slugDeny: [],
            tagAllow: [],
            tagDeny: ['github'],
          },
          {
            environment: null,
            id: 'rule-2',
            slugAllow: [],
            slugDeny: [],
            tagAllow: ['infra'],
            tagDeny: [],
          },
        ],
      });
      expect(ruleRepository.listByRuleSetId).toHaveBeenCalledWith(ruleSetId);
    });

    it('normalizes an unrecognized stored environment to null', async () => {
      ruleSetRepository.findByProjectId.mockResolvedValue(makeRuleSet());
      ruleRepository.listByRuleSetId.mockResolvedValue([
        makeRule({ environment: 'legacy-value', id: 'rule-1' }),
      ]);

      const result = await service.getRuleSetForProject(projectId);

      expect(result?.rules[0]?.environment).toBeNull();
    });
  });

  describe('upsertRuleSet', () => {
    it('sets the posture of the project rule set', async () => {
      const result = await service.upsertRuleSet(projectId, {
        posture: 'deny',
      });

      expect(ruleSetRepository.upsertPosture).toHaveBeenCalledWith(
        projectId,
        'deny',
      );
      expect(result.posture).toBe('deny');
    });

    it('rejects an invalid posture', async () => {
      await expect(
        service.upsertRuleSet(projectId, { posture: 'maybe' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ruleSetRepository.upsertPosture).not.toHaveBeenCalled();
    });
  });

  describe('deleteRuleSet', () => {
    it('returns true when a rule set was removed together with its rules', async () => {
      ruleSetRepository.removeForProject.mockResolvedValue(true);

      await expect(service.deleteRuleSet(projectId)).resolves.toBe(true);
      expect(ruleSetRepository.removeForProject).toHaveBeenCalledWith(
        projectId,
      );
    });

    it('returns false when the project had no rule set', async () => {
      await expect(service.deleteRuleSet(projectId)).resolves.toBe(false);
    });
  });

  describe('addRule', () => {
    it('ensures the rule set then persists the normalized rule', async () => {
      const result = await service.addRule(
        projectId,
        { tagAllow: ['github'] },
        knownTags,
      );

      expect(ruleSetRepository.ensureForProject).toHaveBeenCalledWith(
        projectId,
      );
      expect(ruleRepository.create).toHaveBeenCalledWith({
        editor: null,
        environment: null,
        role: null,
        ruleSetId,
        slugAllow: [],
        slugDeny: [],
        tagAllow: ['github'],
        tagDeny: [],
      });
      expect(result.tagAllow).toEqual(['github']);
    });

    it('scopes the rule to the ensured rule set and keeps the environment', async () => {
      await service.addRule(projectId, { environment: 'ci' }, knownTags);

      expect(ruleRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ environment: 'ci', ruleSetId }),
      );
    });

    it('rejects tag references outside the vocabulary, listing offenders', async () => {
      await expect(
        service.addRule(
          projectId,
          { tagAllow: ['github'], tagDeny: ['unknown-a', 'unknown-b'] },
          knownTags,
        ),
      ).rejects.toThrow(/unknown-a, unknown-b/);
      expect(ruleRepository.create).not.toHaveBeenCalled();
    });

    it('rejects a non-kebab-case tag', async () => {
      await expect(
        service.addRule(projectId, { tagAllow: ['Not Kebab'] }, knownTags),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an invalid environment', async () => {
      await expect(
        service.addRule(projectId, { environment: 'staging' }, knownTags),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('updateRule', () => {
    it('replaces the rule fields by id', async () => {
      ruleRepository.findRuleById.mockResolvedValue(
        makeRule({ id: 'rule-1', tagAllow: ['github'] }),
      );

      const result = await service.updateRule(
        'rule-1',
        { environment: 'interactive', tagDeny: ['infra'] },
        knownTags,
      );

      expect(ruleRepository.update).toHaveBeenCalledWith('rule-1', {
        environment: 'interactive',
        slugAllow: [],
        slugDeny: [],
        tagAllow: [],
        tagDeny: ['infra'],
      });
      expect(result.tagDeny).toEqual(['infra']);
      expect(result.tagAllow).toEqual([]);
      expect(result.environment).toBe('interactive');
    });

    it('throws when the rule id is absent', async () => {
      await expect(
        service.updateRule('missing', { tagAllow: ['github'] }, knownTags),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects tag references outside the vocabulary before touching the row', async () => {
      await expect(
        service.updateRule('rule-1', { tagAllow: ['nope'] }, knownTags),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ruleRepository.findRuleById).not.toHaveBeenCalled();
    });
  });

  describe('removeRule', () => {
    it('returns true when a rule was removed', async () => {
      ruleRepository.removeRule.mockResolvedValue(true);

      await expect(service.removeRule('rule-1')).resolves.toBe(true);
      expect(ruleRepository.removeRule).toHaveBeenCalledWith('rule-1');
    });

    it('returns false when the rule was not present', async () => {
      await expect(service.removeRule('missing')).resolves.toBe(false);
    });
  });
});
