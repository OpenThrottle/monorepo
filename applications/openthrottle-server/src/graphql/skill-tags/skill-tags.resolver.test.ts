import { Test } from '@nestjs/testing';
import type { UserSkillTag } from '@openthrottle/nestjs-repositories-server';
import { SkillTagsRepository } from '@openthrottle/nestjs-repositories-server';
import { createSkillTagsRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import { GraphQLError } from 'graphql';
import { beforeAll, describe, expect, test } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { SKILL_TAG_CONFLICT_CODE } from './skill-tags.constants.ts';
import { SkillTagsResolver } from './skill-tags.resolver.ts';

describe('SkillTagsResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const makeTag = (tag: string): UserSkillTag => {
    return {
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      dimension: 'domain',
      id: `id-${tag}`,
      tag,
      updatedAt: new Date('2026-05-18T12:00:00.000Z'),
      userId,
    };
  };

  const mockSkillTagsRepository = createSkillTagsRepositoryMock();

  let resolver: SkillTagsResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillTagsResolver,
        { provide: SkillTagsRepository, useValue: mockSkillTagsRepository },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = app.get(SkillTagsResolver);
  });

  test('skillTagVocabulary returns tags with a totalCount envelope', async () => {
    const tags = [makeTag('backend'), makeTag('frontend')];
    mockSkillTagsRepository.listForUser.mockResolvedValue(tags);

    const result = await resolver.skillTagVocabulary(userId);

    expect(result).toEqual({ tags, totalCount: 2 });
    expect(mockSkillTagsRepository.listForUser).toHaveBeenCalledWith(userId);
  });

  test('addSkillTag delegates to the service', async () => {
    const created = makeTag('pr-review');
    mockSkillTagsRepository.addTag.mockResolvedValue({
      kind: 'ok',
      value: created,
    });

    const result = await resolver.addSkillTag(userId, { tag: 'pr-review' });

    expect(result).toBe(created);
    expect(mockSkillTagsRepository.addTag).toHaveBeenCalledWith(
      userId,
      'pr-review',
      'domain',
    );
  });

  test('renameSkillTag delegates to the service', async () => {
    const renamed = makeTag('server');
    mockSkillTagsRepository.renameTag.mockResolvedValue({
      kind: 'ok',
      value: renamed,
    });

    const result = await resolver.renameSkillTag(userId, {
      from: 'backend',
      to: 'server',
    });

    expect(result).toBe(renamed);
    expect(mockSkillTagsRepository.renameTag).toHaveBeenCalledWith(
      userId,
      'backend',
      'server',
    );
  });

  test('addSkillTag rejects a duplicate with a SKILL_TAG_CONFLICT GraphQLError', async () => {
    mockSkillTagsRepository.addTag.mockResolvedValue({
      kind: 'conflict',
      tag: 'backend',
    });

    const error = await resolver
      .addSkillTag(userId, { tag: 'backend' })
      .catch((caught: unknown) => {
        return caught;
      });

    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({
      extensions: { code: SKILL_TAG_CONFLICT_CODE, tag: 'backend' },
      message: 'Tag "backend" is already in your skill-tag vocabulary.',
    });
  });

  test('renameSkillTag rejects an existing target with a SKILL_TAG_CONFLICT GraphQLError', async () => {
    mockSkillTagsRepository.renameTag.mockResolvedValue({
      kind: 'conflict',
      tag: 'frontend',
    });

    const error = await resolver
      .renameSkillTag(userId, { from: 'backend', to: 'frontend' })
      .catch((caught: unknown) => {
        return caught;
      });

    expect(error).toBeInstanceOf(GraphQLError);
    expect(error).toMatchObject({
      extensions: { code: SKILL_TAG_CONFLICT_CODE, tag: 'frontend' },
    });
  });

  test('removeSkillTag returns the service boolean', async () => {
    mockSkillTagsRepository.removeTag.mockResolvedValue(true);

    const result = await resolver.removeSkillTag(userId, { tag: 'backend' });

    expect(result).toBe(true);
    expect(mockSkillTagsRepository.removeTag).toHaveBeenCalledWith(
      userId,
      'backend',
    );
  });
});
