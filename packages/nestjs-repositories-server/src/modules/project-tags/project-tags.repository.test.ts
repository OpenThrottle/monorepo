import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { createQueryBuilderMock } from '@openthrottle/nestjs-postgres/testing';
import type { Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Plan } from '../plans/plan.entity.ts';
import { ProjectTag } from './project-tag.entity.ts';
import { projectTagsFactory } from './project-tags.factory.ts';
import { ProjectTagsRepository } from './project-tags.repository.ts';

const planId = '22222222-2222-4222-8222-222222222222';
const projectId = '66666666-6666-4666-8666-666666666666';

describe('ProjectTagsRepository', () => {
  const findOne = vi.fn();
  const builder = createQueryBuilderMock<ProjectTag>();
  let repository: ProjectTagsRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    findOne.mockResolvedValue(null);

    const app = await Test.createTestingModule({
      providers: [
        ProjectTagsRepository,
        {
          provide: getRepositoryToken(ProjectTag),
          useValue: createMock<Repository<ProjectTag>>({
            createQueryBuilder: vi.fn(() => {
              return builder;
            }),
            findOne,
            target: ProjectTag,
          }),
        },
      ],
    }).compile();

    repository = app.get(ProjectTagsRepository);
  });

  describe('findByProjectAndTag', () => {
    it('looks the tag up on that project', async () => {
      const row = projectTagsFactory.build({ projectId, tag: 'backend' });
      findOne.mockResolvedValue(row);

      await expect(
        repository.findByProjectAndTag(projectId, 'backend'),
      ).resolves.toBe(row);
      expect(findOne).toHaveBeenCalledWith({
        where: { projectId, tag: 'backend' },
      });
    });
  });

  describe('listForPlanProject', () => {
    it("joins the plan to read its project's tags", async () => {
      const rows = projectTagsFactory.buildList(2, { projectId });
      builder.getMany.mockResolvedValue(rows);

      await expect(repository.listForPlanProject(planId)).resolves.toEqual(
        rows,
      );
      expect(builder.innerJoin).toHaveBeenCalledWith(
        Plan,
        'plan',
        'plan.project_id = projectTag.project_id',
      );
      expect(builder.where).toHaveBeenCalledWith('plan.id = :planId', {
        planId,
      });
    });
  });
});
