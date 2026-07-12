import type { UserSkillTag } from '@openthrottle/nestjs-repositories';
import { SkillTagsService } from '@openthrottle/nestjs-repositories';
import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { beforeAll, describe, expect, test, vi } from 'vitest';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { SkillTagsResolver } from './skill-tags.resolver';

describe('SkillTagsResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const makeTag = (tag: string): UserSkillTag => ({
    createdAt: new Date('2026-05-18T12:00:00.000Z'),
    id: `id-${tag}`,
    tag,
    updatedAt: new Date('2026-05-18T12:00:00.000Z'),
    userId,
  });

  const mockSkillTagsService = createMock<SkillTagsService>({
    addTag: vi.fn(),
    listForUser: vi.fn(),
    removeTag: vi.fn(),
    renameTag: vi.fn(),
  });

  let resolver: SkillTagsResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        SkillTagsResolver,
        { provide: SkillTagsService, useValue: mockSkillTagsService },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = app.get(SkillTagsResolver);
  });

  test('skillTagVocabulary returns tags with a totalCount envelope', async () => {
    const tags = [makeTag('backend'), makeTag('frontend')];
    vi.mocked(mockSkillTagsService.listForUser).mockResolvedValue(tags);

    const result = await resolver.skillTagVocabulary(userId);

    expect(result).toEqual({ tags, totalCount: 2 });
    expect(mockSkillTagsService.listForUser).toHaveBeenCalledWith(userId);
  });

  test('addSkillTag delegates to the service', async () => {
    const created = makeTag('pr-review');
    vi.mocked(mockSkillTagsService.addTag).mockResolvedValue(created);

    const result = await resolver.addSkillTag(userId, { tag: 'pr-review' });

    expect(result).toBe(created);
    expect(mockSkillTagsService.addTag).toHaveBeenCalledWith(
      userId,
      'pr-review',
    );
  });

  test('renameSkillTag delegates to the service', async () => {
    const renamed = makeTag('server');
    vi.mocked(mockSkillTagsService.renameTag).mockResolvedValue(renamed);

    const result = await resolver.renameSkillTag(userId, {
      from: 'backend',
      to: 'server',
    });

    expect(result).toBe(renamed);
    expect(mockSkillTagsService.renameTag).toHaveBeenCalledWith(
      userId,
      'backend',
      'server',
    );
  });

  test('removeSkillTag returns the service boolean', async () => {
    vi.mocked(mockSkillTagsService.removeTag).mockResolvedValue(true);

    const result = await resolver.removeSkillTag(userId, { tag: 'backend' });

    expect(result).toBe(true);
    expect(mockSkillTagsService.removeTag).toHaveBeenCalledWith(
      userId,
      'backend',
    );
  });
});
