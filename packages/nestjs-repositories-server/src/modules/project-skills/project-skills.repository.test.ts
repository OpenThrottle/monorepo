import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { ProjectSkillInput } from '@openthrottle/openthrottle-skills';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProjectSkill } from './project-skill.entity.ts';
import { projectSkillsFactory } from './project-skills.factory.ts';
import { ProjectSkillsRepository } from './project-skills.repository.ts';

const projectId = '22222222-2222-4222-8222-222222222222';

const input = (
  overrides: Partial<ProjectSkillInput> & Pick<ProjectSkillInput, 'slug'>,
): ProjectSkillInput => {
  return {
    description: null,
    disableModelInvocation: undefined,
    outcomeTelemetry: undefined,
    source: 'external',
    sourcePath: `.agents/skills/${overrides.slug}/SKILL.md`,
    sourceUrl: undefined,
    tags: [],
    ...overrides,
  };
};

describe('ProjectSkillsRepository', () => {
  const find = vi.fn();
  const findOne = vi.fn();
  const insertMany = vi.fn();
  const softDelete = vi.fn();
  const update = vi.fn();
  let repository: ProjectSkillsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    find.mockResolvedValue([]);
    findOne.mockResolvedValue(null);
    softDelete.mockResolvedValue({ affected: 0 });
    update.mockResolvedValue({ affected: 1 });

    const app = await Test.createTestingModule({
      providers: [
        ProjectSkillsRepository,
        {
          provide: getRepositoryToken(ProjectSkill),
          useValue: createMock<Repository<ProjectSkill>>({
            find,
            findOne,
            softDelete,
            target: ProjectSkill,
            update,
          }),
        },
      ],
    }).compile();

    repository = app.get(ProjectSkillsRepository);
    vi.spyOn(repository, 'createMany').mockImplementation(insertMany);
  });

  describe('listForProject', () => {
    it('lists live rows alphabetically by slug', async () => {
      const rows = projectSkillsFactory.buildList(2, { projectId });
      find.mockResolvedValue(rows);

      await expect(repository.listForProject(projectId)).resolves.toEqual(rows);
      expect(find).toHaveBeenCalledWith({
        order: { slug: 'ASC' },
        where: { projectId },
      });
    });
  });

  describe('findByProjectAndSlug', () => {
    it('looks the slug up on that project', async () => {
      const row = projectSkillsFactory.build({ projectId, slug: 'a' });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByProjectAndSlug(projectId, 'a'),
      ).resolves.toBe(row);
    });

    it('returns null for an unknown slug', async () => {
      await expect(
        repository.findByProjectAndSlug(projectId, 'missing'),
      ).resolves.toBeNull();
    });
  });

  describe('reconcile', () => {
    it('updates existing slugs without overwriting tags and orphans vanished slugs', async () => {
      find.mockResolvedValue([
        projectSkillsFactory.build({
          projectId,
          slug: 'kept',
          tags: ['github'],
        }),
        projectSkillsFactory.build({ projectId, slug: 'stale-one' }),
        projectSkillsFactory.build({ projectId, slug: 'stale-two' }),
      ]);

      const result = await repository.reconcile(projectId, [
        input({
          description: 'Keeps things.',
          disableModelInvocation: true,
          slug: 'kept',
          tags: ['docs'],
        }),
      ]);

      expect(insertMany).toHaveBeenCalledWith([]);
      const keptPayload = update.mock.calls.find((call) => {
        return call[0]?.slug === 'kept';
      })?.[1];
      expect(keptPayload).toEqual(
        expect.objectContaining({
          description: 'Keeps things.',
          disableModelInvocation: true,
          orphanedAt: null,
          sourcePath: '.agents/skills/kept/SKILL.md',
        }),
      );
      expect(keptPayload).not.toHaveProperty('tags');
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ projectId, slug: 'stale-one' }),
        expect.objectContaining({ orphanedAt: expect.any(Date) }),
      );
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ projectId, slug: 'stale-two' }),
        expect.objectContaining({ orphanedAt: expect.any(Date) }),
      );
      expect(result).toEqual({
        staleSlugs: ['stale-one', 'stale-two'],
        upserted: 1,
      });
    });

    it('inserts a brand-new slug with empty tags', async () => {
      const result = await repository.reconcile(projectId, [
        input({
          description: 'New skill.',
          slug: 'brand-new',
          tags: ['github'],
        }),
      ]);

      expect(update).not.toHaveBeenCalled();
      expect(insertMany).toHaveBeenCalledWith([
        expect.objectContaining({
          description: 'New skill.',
          orphanedAt: null,
          projectId,
          slug: 'brand-new',
          tags: [],
        }),
      ]);
      expect(result).toEqual({ staleSlugs: [], upserted: 1 });
    });

    it('does not stamp orphanedAt again when the slug is already orphaned', async () => {
      find.mockResolvedValue([
        projectSkillsFactory.build({
          orphanedAt: new Date('2026-08-01T00:00:00.000Z'),
          projectId,
          slug: 'gone',
        }),
      ]);

      const result = await repository.reconcile(projectId, []);

      expect(update).not.toHaveBeenCalled();
      expect(result).toEqual({ staleSlugs: ['gone'], upserted: 0 });
    });

    it('carries source into the update and normalizes unset values to null', async () => {
      find.mockResolvedValue([
        projectSkillsFactory.build({ projectId, slug: 'owned' }),
      ]);

      await repository.reconcile(projectId, [
        input({ slug: 'owned', source: 'openthrottle' }),
      ]);

      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ projectId, slug: 'owned' }),
        expect.objectContaining({
          disableModelInvocation: null,
          outcomeTelemetry: null,
          source: 'openthrottle',
          sourceUrl: null,
        }),
      );
    });

    it('carries an outcome-telemetry opt-out into the insert', async () => {
      await repository.reconcile(projectId, [
        input({ outcomeTelemetry: 'none', slug: 'quiet' }),
      ]);

      expect(insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ outcomeTelemetry: 'none', slug: 'quiet' }),
      ]);
    });

    it('orphans every live row and inserts nothing when the input set is empty', async () => {
      find.mockResolvedValue([
        projectSkillsFactory.build({ projectId, slug: 'gone-one' }),
        projectSkillsFactory.build({ projectId, slug: 'gone-two' }),
      ]);

      const result = await repository.reconcile(projectId, []);

      expect(insertMany).toHaveBeenCalledWith([]);
      expect(update).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        staleSlugs: ['gone-one', 'gone-two'],
        upserted: 0,
      });
    });

    it('reads through the soft-delete scope, so a soft-deleted slug is inserted again', async () => {
      await repository.reconcile(projectId, [input({ slug: 'revived' })]);

      expect(find).toHaveBeenCalledWith({
        where: { projectId },
      });
      expect(insertMany).toHaveBeenCalledWith([
        expect.objectContaining({ slug: 'revived' }),
      ]);
    });
  });

  describe('removeBySlug', () => {
    it('soft deletes the live row and returns true', async () => {
      softDelete.mockResolvedValue({ affected: 1 });

      await expect(repository.removeBySlug(projectId, 'gone')).resolves.toBe(
        true,
      );
      expect(softDelete).toHaveBeenCalledWith(
        expect.objectContaining({ projectId, slug: 'gone' }),
      );
    });

    it('returns false when no live row matched', async () => {
      await expect(repository.removeBySlug(projectId, 'missing')).resolves.toBe(
        false,
      );
    });
  });
});
