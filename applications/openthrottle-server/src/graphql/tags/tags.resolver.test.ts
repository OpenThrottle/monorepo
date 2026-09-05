import { createMock } from '@golevelup/ts-vitest';
import { AUTH_PRINCIPAL_KIND_USER } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import type {
  PlansService,
  ServiceAccountsService,
  TagsService,
} from '@openthrottle/nestjs-repositories';
import { type ProjectTag } from '@openthrottle/nestjs-repositories';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { PlanRulesEvaluationService } from '../../queues/plan-rules/plan-rules-evaluation.service';
import { PLAN_RULES_TRIGGER_KINDS } from '../../queues/plan-rules/plan-rules.types';
import { ProjectTagsResolver } from './tags.resolver';
import type { TagsLoaders } from './tags-loaders';

const PROJECT_ID = 'project-1';
const userPrincipal: AuthPrincipal = createMock<AuthPrincipal>({
  kind: AUTH_PRINCIPAL_KIND_USER,
  sub: 'user-1',
});

describe('ProjectTagsResolver', () => {
  const enqueueEvaluation = vi.fn().mockResolvedValue(undefined);
  const planFind = vi
    .fn()
    .mockResolvedValue([{ id: 'plan-a' }, { id: 'plan-b' }]);
  const addProjectTag = vi
    .fn()
    .mockResolvedValue(createMock<ProjectTag>({ tag: 'backend' }));
  const removeProjectTag = vi.fn();

  const resolver = new ProjectTagsResolver(
    createMock<TagsLoaders>(),
    createMock<LoggerService>(),
    createMock<PlansService>({
      getRepository: vi.fn().mockReturnValue({ find: planFind }),
    }),
    createMock<PlanRulesEvaluationService>({ enqueueEvaluation }),
    createMock<ServiceAccountsService>(),
    createMock<TagsService>({ addProjectTag, removeProjectTag }),
  );

  beforeEach(() => {
    enqueueEvaluation.mockClear();
    planFind.mockClear();
  });

  test('addProjectTag enqueues a TAG_CHANGED evaluation for every plan in the project', async () => {
    await resolver.addProjectTag(userPrincipal, {
      projectId: PROJECT_ID,
      tag: 'backend',
    });

    expect(planFind).toHaveBeenCalledWith({
      select: { id: true },
      where: { projectId: PROJECT_ID },
    });
    expect(enqueueEvaluation).toHaveBeenCalledTimes(2);
    expect(enqueueEvaluation).toHaveBeenCalledWith(
      'plan-a',
      PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
    );
    expect(enqueueEvaluation).toHaveBeenCalledWith(
      'plan-b',
      PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
    );
  });

  test('removeProjectTag enqueues evaluation only when a tag was removed', async () => {
    removeProjectTag.mockResolvedValueOnce(true);
    await resolver.removeProjectTag(userPrincipal, {
      projectId: PROJECT_ID,
      tag: 'backend',
    });
    expect(enqueueEvaluation).toHaveBeenCalledTimes(2);

    enqueueEvaluation.mockClear();
    removeProjectTag.mockResolvedValueOnce(false);
    await resolver.removeProjectTag(userPrincipal, {
      projectId: PROJECT_ID,
      tag: 'not-present',
    });
    expect(enqueueEvaluation).not.toHaveBeenCalled();
  });
});
