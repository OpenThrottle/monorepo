import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SkillAvailabilityRuleSet } from './skill-availability-rule-set.entity';
import { SkillAvailabilityRule } from './skill-availability-rule.entity';
import { SkillAvailabilityService } from './skill-availability.service';

describe('SkillAvailabilityService', () => {
  const projectId = '22222222-2222-4222-8222-222222222222';
  const ruleSetId = '33333333-3333-4333-8333-333333333333';
  const knownTags = ['backend', 'github', 'infra'];

  const makeRuleSet = (
    overrides: Partial<SkillAvailabilityRuleSet> = {},
  ): SkillAvailabilityRuleSet =>
    asMock<SkillAvailabilityRuleSet>({
      createdAt: new Date('2026-07-11T12:00:00.000Z'),
      id: ruleSetId,
      posture: 'allow',
      projectId,
      updatedAt: new Date('2026-07-11T12:00:00.000Z'),
      ...overrides,
    });

  const makeRule = (
    overrides: Partial<SkillAvailabilityRule> &
      Pick<SkillAvailabilityRule, 'id'>,
  ): SkillAvailabilityRule =>
    asMock<SkillAvailabilityRule>({
      createdAt: new Date('2026-07-11T12:00:00.000Z'),
      editor: null,
      environment: null,
      role: null,
      ruleSetId,
      slugAllow: [],
      slugDeny: [],
      tagAllow: [],
      tagDeny: [],
      updatedAt: new Date('2026-07-11T12:00:00.000Z'),
      ...overrides,
    });

  const ruleSetRepository = {
    create: vi.fn((data: Partial<SkillAvailabilityRuleSet>) => ({ ...data })),
    delete: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: SkillAvailabilityRuleSet) => Promise.resolve(entity)),
  };
  const ruleRepository = {
    create: vi.fn((data: Partial<SkillAvailabilityRule>) => ({ ...data })),
    delete: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn((entity: SkillAvailabilityRule) => Promise.resolve(entity)),
  };

  let service: SkillAvailabilityService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillAvailabilityService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(SkillAvailabilityRuleSet),
          useValue: ruleSetRepository,
        },
        {
          provide: getRepositoryToken(SkillAvailabilityRule),
          useValue: ruleRepository,
        },
      ],
    }).compile();

    service = app.get(SkillAvailabilityService);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ruleSetRepository.create.mockImplementation((data) => ({ ...data }));
    ruleSetRepository.save.mockImplementation((entity) =>
      Promise.resolve({ ...entity, id: entity.id ?? ruleSetId }),
    );
    ruleRepository.create.mockImplementation((data) => ({ ...data }));
    ruleRepository.save.mockImplementation((entity) => Promise.resolve(entity));
  });

  describe('getRuleSetForProject', () => {
    it('returns undefined when the project has no rule set (passthrough)', async () => {
      ruleSetRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getRuleSetForProject(projectId),
      ).resolves.toBeUndefined();
      expect(ruleRepository.find).not.toHaveBeenCalled();
    });

    it('maps stored rows EXACTLY onto the resolver rule-set shape', async () => {
      ruleSetRepository.findOne.mockResolvedValue(
        makeRuleSet({ posture: 'deny' }),
      );
      ruleRepository.find.mockResolvedValue([
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
      expect(ruleRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', id: 'ASC' },
        where: { ruleSetId },
      });
    });

    it('normalizes an unrecognized stored environment to null', async () => {
      ruleSetRepository.findOne.mockResolvedValue(makeRuleSet());
      ruleRepository.find.mockResolvedValue([
        makeRule({ environment: 'legacy-value', id: 'rule-1' }),
      ]);

      const result = await service.getRuleSetForProject(projectId);

      expect(result?.rules[0]?.environment).toBeNull();
    });
  });

  describe('upsertRuleSet', () => {
    it('creates a rule set when none exists', async () => {
      ruleSetRepository.findOne.mockResolvedValue(null);

      const result = await service.upsertRuleSet(projectId, {
        posture: 'deny',
      });

      expect(ruleSetRepository.create).toHaveBeenCalledWith({
        posture: 'deny',
        projectId,
      });
      expect(result.posture).toBe('deny');
    });

    it('updates the posture of an existing rule set', async () => {
      const existing = makeRuleSet({ posture: 'allow' });
      ruleSetRepository.findOne.mockResolvedValue(existing);

      const result = await service.upsertRuleSet(projectId, {
        posture: 'deny',
      });

      expect(ruleSetRepository.create).not.toHaveBeenCalled();
      expect(result.posture).toBe('deny');
    });

    it('rejects an invalid posture', async () => {
      await expect(
        service.upsertRuleSet(projectId, { posture: 'maybe' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ruleSetRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteRuleSet', () => {
    it('returns true when a rule set was deleted', async () => {
      ruleSetRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteRuleSet(projectId)).resolves.toBe(true);
      expect(ruleSetRepository.delete).toHaveBeenCalledWith({ projectId });
    });

    it('returns false when the project had no rule set', async () => {
      ruleSetRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteRuleSet(projectId)).resolves.toBe(false);
    });
  });

  describe('addRule', () => {
    it('creates the rule set on demand then persists the normalized rule', async () => {
      ruleSetRepository.findOne.mockResolvedValue(null);

      const result = await service.addRule(
        projectId,
        { tagAllow: ['github'] },
        knownTags,
      );

      expect(ruleSetRepository.create).toHaveBeenCalledWith({
        posture: 'allow',
        projectId,
      });
      expect(ruleRepository.create).toHaveBeenCalledWith({
        environment: null,
        ruleSetId,
        slugAllow: [],
        slugDeny: [],
        tagAllow: ['github'],
        tagDeny: [],
      });
      expect(result.tagAllow).toEqual(['github']);
    });

    it('reuses an existing rule set', async () => {
      ruleSetRepository.findOne.mockResolvedValue(makeRuleSet());

      await service.addRule(projectId, { environment: 'ci' }, knownTags);

      expect(ruleSetRepository.create).not.toHaveBeenCalled();
      const created = ruleRepository.create.mock.calls[0]?.[0];
      expect(created).toMatchObject({ environment: 'ci', ruleSetId });
    });

    it('rejects tag references outside the vocabulary, listing offenders', async () => {
      await expect(
        service.addRule(
          projectId,
          { tagAllow: ['github'], tagDeny: ['unknown-a', 'unknown-b'] },
          knownTags,
        ),
      ).rejects.toThrow(/unknown-a, unknown-b/);
      expect(ruleRepository.save).not.toHaveBeenCalled();
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
      ruleRepository.findOne.mockResolvedValue(
        makeRule({ id: 'rule-1', tagAllow: ['github'] }),
      );

      const result = await service.updateRule(
        'rule-1',
        { environment: 'interactive', tagDeny: ['infra'] },
        knownTags,
      );

      expect(result.tagDeny).toEqual(['infra']);
      expect(result.tagAllow).toEqual([]);
      expect(result.environment).toBe('interactive');
    });

    it('throws when the rule id is absent', async () => {
      ruleRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRule('missing', { tagAllow: ['github'] }, knownTags),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects tag references outside the vocabulary before touching the row', async () => {
      await expect(
        service.updateRule('rule-1', { tagAllow: ['nope'] }, knownTags),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(ruleRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('removeRule', () => {
    it('returns true when a rule was removed', async () => {
      ruleRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.removeRule('rule-1')).resolves.toBe(true);
      expect(ruleRepository.delete).toHaveBeenCalledWith({ id: 'rule-1' });
    });

    it('returns false when the rule was not present', async () => {
      ruleRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.removeRule('missing')).resolves.toBe(false);
    });
  });
});
