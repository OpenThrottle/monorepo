/**
 * @description Unit tests for {@link TaggingProcessor}: vocabulary/cap
 * enforcement, replace-own-rows idempotency (own stale server-llm rows
 * removed; human/agent rows untouched), refine's domain-only contract,
 * ladder-disagreement logging (never forced), evaluation-event emission, and
 * the stub provider + strict response parsing.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { GitHubService } from '@openthrottle/nestjs-github';
import type {
  Plan,
  PlanTag,
  PlansService,
  ServiceAccountsService,
  SkillTagsService,
  TagsService,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { asMock } from '@openthrottle/nestjs-testing';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PlanRulesEvaluationService } from '../plan-rules/plan-rules-evaluation.service';
import { StubTaggingModelProvider } from './tagging-model-providers';
import {
  parseTaggingResponse,
  type TaggingModelProvider,
  type TaggingPrediction,
} from './tagging-model.provider';
import { TaggingProcessor } from './tagging.processor';
import type { PredictTaggingJob, RefineTaggingJob } from './tagging.types';

const planId = '00000000-0000-4000-8000-000000000001';

const planTagRow = (
  tag: string,
  source: string,
  dimension = 'domain',
): PlanTag => asMock<PlanTag>({ dimension, planId, source, tag });

describe('TaggingProcessor', () => {
  let processor: TaggingProcessor;
  let classify: Mock<TaggingModelProvider['classify']>;
  let provider: TaggingModelProvider;
  let tagsService: TagsService;
  let planTagRows: PlanTag[];
  let planRulesEvaluationService: PlanRulesEvaluationService;
  let getCommitDetail: Mock<GitHubService['getCommitDetail']>;

  const predictJob = (): PredictTaggingJob =>
    asMock<PredictTaggingJob>({
      data: { entityId: planId, entityType: 'plan' },
      name: 'predict',
    });

  const refineJob = (): RefineTaggingJob =>
    asMock<RefineTaggingJob>({
      data: { planId, repo: 'OpenThrottle/monorepo', sha: 'abc123' },
      name: 'refine',
    });

  beforeEach(() => {
    vi.clearAllMocks();
    classify = vi.fn().mockResolvedValue([]);
    provider = {
      classify: (input, vocabulary) => classify(input, vocabulary),
      name: 'test',
    };
    planTagRows = [];

    tagsService = createMock<TagsService>({
      addPlanTag: vi.fn((_caller, _id, tag) =>
        Promise.resolve(planTagRow(tag, 'server-llm')),
      ),
      getPlanTagsRepository: vi.fn(() =>
        asMock({ find: vi.fn(() => Promise.resolve(planTagRows)) }),
      ),
      removePlanTag: vi.fn().mockResolvedValue(true),
    });
    planRulesEvaluationService = createMock<PlanRulesEvaluationService>();
    getCommitDetail = vi.fn().mockResolvedValue({
      additions: 10,
      deletions: 2,
      files: [
        {
          additions: 10,
          deletions: 2,
          filename: 'infra/main.tf',
          patch: '+resource "aws_s3_bucket" "b" {}',
          status: 'modified',
        },
      ],
      message: 'feat(infra): bucket',
      sha: 'abc123',
    });

    processor = new TaggingProcessor(
      createMock<GitHubService>({ getCommitDetail }),
      createMock<LoggerService>(),
      planRulesEvaluationService,
      createMock<PlansService>({
        getRepository: vi.fn(() =>
          asMock({
            findOne: vi.fn(() =>
              Promise.resolve(
                asMock<Plan>({
                  description: 'Terraform the infra',
                  id: planId,
                  summary: null,
                  title: 'Breakdown the infra work',
                }),
              ),
            ),
          }),
        ),
      }),
      createMock<ServiceAccountsService>({
        findAll: vi.fn().mockResolvedValue([]),
      }),
      createMock<SkillTagsService>({
        getRepository: vi.fn(() =>
          asMock({ find: vi.fn(() => Promise.resolve([])) }),
        ),
      }),
      provider,
      tagsService,
      createMock<TasksService>(),
    );
  });

  it('applies in-vocabulary predictions as the tagging identity and enqueues evaluation', async () => {
    classify.mockResolvedValue([
      { confidence: 0.9, dimension: 'phase', tag: 'breakdown' },
      { confidence: 0.8, dimension: 'domain', tag: 'infra' },
    ] satisfies TaggingPrediction[]);

    const result = await processor.process(predictJob());

    expect(result).toEqual({ added: 2, removed: 0, skipped: null });
    expect(tagsService.addPlanTag).toHaveBeenCalledWith(
      expect.objectContaining({
        principalKind: 'service_account',
        serviceAccountName: 'tagging',
      }),
      planId,
      'infra',
      { confidence: 0.8 },
    );
    expect(planRulesEvaluationService.enqueueEvaluation).toHaveBeenCalledWith(
      planId,
      'tag-changed',
    );
  });

  it('drops out-of-vocabulary and dimension-mismatched predictions, and caps 5 domain + 1 phase', async () => {
    classify.mockResolvedValue([
      { confidence: 0.99, dimension: 'domain', tag: 'not-in-vocab' },
      { confidence: 0.98, dimension: 'phase', tag: 'github' },
      { confidence: 0.9, dimension: 'phase', tag: 'breakdown' },
      { confidence: 0.89, dimension: 'phase', tag: 'design' },
      { confidence: 0.8, dimension: 'domain', tag: 'backend' },
      { confidence: 0.79, dimension: 'domain', tag: 'ci' },
      { confidence: 0.78, dimension: 'domain', tag: 'database' },
      { confidence: 0.77, dimension: 'domain', tag: 'docs' },
      { confidence: 0.76, dimension: 'domain', tag: 'frontend' },
      { confidence: 0.75, dimension: 'domain', tag: 'git' },
    ]);

    const result = await processor.process(predictJob());

    // 5 domain (highest confidence) + 1 phase; unknown + mismatched dropped.
    expect(result.added).toBe(6);
    expect(tagsService.addPlanTag).not.toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'not-in-vocab',
      expect.anything(),
    );
    expect(tagsService.addPlanTag).not.toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'git',
      expect.anything(),
    );
    expect(tagsService.addPlanTag).toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'breakdown',
      { confidence: 0.9 },
    );
  });

  it('replace-own-rows: removes stale server-llm rows but never human/agent rows', async () => {
    classify.mockResolvedValue([
      { confidence: 0.8, dimension: 'domain', tag: 'infra' },
    ]);
    planTagRows = [
      planTagRow('infra', 'server-llm'),
      planTagRow('database', 'server-llm'),
      planTagRow('github', 'human'),
      planTagRow('backend', 'agent'),
    ];

    const result = await processor.process(predictJob());

    expect(tagsService.removePlanTag).toHaveBeenCalledTimes(1);
    expect(tagsService.removePlanTag).toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'database',
    );
    expect(result.removed).toBe(1);
  });

  it('is idempotent on redelivery: matching prediction set removes nothing', async () => {
    classify.mockResolvedValue([
      { confidence: 0.8, dimension: 'domain', tag: 'infra' },
    ]);
    planTagRows = [planTagRow('infra', 'server-llm')];

    const result = await processor.process(predictJob());

    expect(tagsService.removePlanTag).not.toHaveBeenCalled();
    expect(result.removed).toBe(0);
  });

  it('a ladder rejection is logged, not forced', async () => {
    classify.mockResolvedValue([
      { confidence: 0.8, dimension: 'domain', tag: 'infra' },
    ]);
    planTagRows = [planTagRow('database', 'server-llm')];
    vi.mocked(tagsService.removePlanTag).mockRejectedValue(
      new Error('outranks'),
    );

    const result = await processor.process(predictJob());

    expect(result.removed).toBe(0);
    expect(result.skipped).toBeNull();
  });

  it('model failure (after the provider retry) skips without writes', async () => {
    classify.mockRejectedValue(new Error('model down'));

    const result = await processor.process(predictJob());

    expect(result.skipped).toBe('model-failed');
    expect(tagsService.addPlanTag).not.toHaveBeenCalled();
  });

  it('refine classifies domain-only and never removes phase rows', async () => {
    classify.mockResolvedValue([
      { confidence: 0.9, dimension: 'domain', tag: 'infra' },
      { confidence: 0.95, dimension: 'phase', tag: 'breakdown' },
    ]);
    planTagRows = [
      planTagRow('design', 'server-llm', 'phase'),
      planTagRow('database', 'server-llm'),
    ];

    const result = await processor.process(refineJob());

    // The phase prediction is dropped; the stale phase row survives.
    expect(tagsService.addPlanTag).toHaveBeenCalledTimes(1);
    expect(tagsService.addPlanTag).toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'infra',
      { confidence: 0.9 },
    );
    expect(tagsService.removePlanTag).toHaveBeenCalledTimes(1);
    expect(tagsService.removePlanTag).toHaveBeenCalledWith(
      expect.anything(),
      planId,
      'database',
    );
    expect(result).toEqual({ added: 1, removed: 1, skipped: null });
  });

  it('refine skips with a warning when the commit is unknown (no retry)', async () => {
    getCommitDetail.mockResolvedValue(null);

    const result = await processor.process(refineJob());

    expect(result.skipped).toBe('diff-unavailable');
  });

  it('refine propagates GitHub transport errors so BullMQ backs off', async () => {
    getCommitDetail.mockRejectedValue(new Error('GitHub API error 503'));

    await expect(processor.process(refineJob())).rejects.toThrow('503');
  });
});

describe('StubTaggingModelProvider', () => {
  it('predicts vocabulary tags appearing in the text, deterministically', async () => {
    const provider = new StubTaggingModelProvider();

    const predictions = await provider.classify(
      {
        description: 'We must breakdown the terraform work',
        summary: null,
        title: 'Infra plan',
      },
      [
        { dimension: 'phase', tag: 'breakdown' },
        { dimension: 'domain', tag: 'terraform' },
        { dimension: 'domain', tag: 'github' },
      ],
    );

    expect(predictions).toEqual([
      { confidence: 0.5, dimension: 'phase', tag: 'breakdown' },
      { confidence: 0.5, dimension: 'domain', tag: 'terraform' },
    ]);
  });
});

describe('parseTaggingResponse', () => {
  it('parses strict JSON embedded in prose', () => {
    expect(
      parseTaggingResponse(
        'Sure! {"tags": [{"tag": "infra", "dimension": "domain", "confidence": 0.7}]}',
      ),
    ).toEqual([{ confidence: 0.7, dimension: 'domain', tag: 'infra' }]);
  });

  it('throws on schema violations (unknown dimension)', () => {
    expect(() =>
      parseTaggingResponse('{"tags": [{"tag": "x", "dimension": "vibe"}]}'),
    ).toThrow();
  });

  it('throws when no JSON object is present', () => {
    expect(() => parseTaggingResponse('no tags here')).toThrow();
  });
});
