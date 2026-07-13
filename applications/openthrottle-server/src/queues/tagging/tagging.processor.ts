/**
 * @description BullMQ worker for the tagging queue.
 *
 * predict — closed-vocabulary classification of a just-created plan/task
 * (title + summary + description) as the tagging service account
 * (source=server-llm). Out-of-vocabulary predictions are dropped server-side,
 * caps enforced (0–5 domain, ≤1 phase), then reconciled replace-own-rows:
 * predicted tags are added (the ladder no-ops against higher-provenance
 * rows), and this job's OWN stale server-llm rows not in the prediction are
 * removed. Ladder conflicts are logged, never forced. Idempotent under
 * at-least-once redelivery.
 *
 * refine — fetches the landed squash diff for (repo, sha), classifies DOMAIN
 * tags only, and reconciles the plan's server-llm DOMAIN rows the same way
 * (phase rows are never touched). A missing commit skips with a warning; a
 * GitHub error throws so BullMQ backs off and retries.
 *
 * Both jobs re-enqueue plan-rules evaluation after writing tags (the
 * evaluation event) — they never invoke the rules engine directly. The
 * tagging service account's vocabulary is its own user_skill_tags rows when
 * present, else the committed default (slice-2 fallback).
 */

import { Inject } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { defaultWorkerOptions } from '@openthrottle/nestjs-bullmq';
import { GitHubService } from '@openthrottle/nestjs-github';
import {
  PlansService,
  ServiceAccountsService,
  SkillTagsService,
  TAGGING_SERVICE_ACCOUNT_NAME,
  TagsService,
  TasksService,
  type PlanTag,
  type TagCaller,
  type TaskTag,
} from '@openthrottle/nestjs-repositories';
import { DEFAULT_TAG_VOCABULARY_SEED } from '@openthrottle/openthrottle-skills';
import { PlanRulesEvaluationService } from '../plan-rules/plan-rules-evaluation.service';
import { PLAN_RULES_TRIGGER_KINDS } from '../plan-rules/plan-rules.types';
import {
  TAGGING_DIFF_PATCH_BUDGET_CHARS,
  TAGGING_MAX_DOMAIN_TAGS,
  TAGGING_QUEUE_NAME,
  TAGGING_WORKER_CONCURRENCY,
} from './tagging.constants';
import {
  TAGGING_MODEL_PROVIDER_TOKEN,
  type TaggingModelProvider,
  type TaggingPrediction,
  type TaggingVocabularyEntry,
} from './tagging-model.provider';
import {
  TAGGING_ENTITY_TYPES,
  type PredictTaggingJob,
  type RefineTaggingJob,
  type TaggingJobResult,
} from './tagging.types';

const SOURCE_SERVER_LLM = 'server-llm';

type TaggingJob = PredictTaggingJob | RefineTaggingJob;

@Processor(TAGGING_QUEUE_NAME, {
  ...defaultWorkerOptions,
  concurrency: TAGGING_WORKER_CONCURRENCY,
})
export class TaggingProcessor
  extends WorkerHost
  implements OnApplicationShutdown, OnModuleInit
{
  constructor(
    private readonly githubService: GitHubService,
    private readonly logger: LoggerService,
    private readonly planRulesEvaluationService: PlanRulesEvaluationService,
    private readonly plansService: PlansService,
    private readonly serviceAccountsService: ServiceAccountsService,
    private readonly skillTagsService: SkillTagsService,
    @Inject(TAGGING_MODEL_PROVIDER_TOKEN)
    private readonly taggingModelProvider: TaggingModelProvider,
    private readonly tagsService: TagsService,
    private readonly tasksService: TasksService,
  ) {
    super();
  }

  onModuleInit(): void {
    this.logger.info(
      `Tagging worker started (provider=${this.taggingModelProvider.name}, concurrency=${TAGGING_WORKER_CONCURRENCY})`,
      TaggingProcessor.name,
    );
  }

  onApplicationShutdown(): Promise<void> {
    return this.worker.close();
  }

  async process(job: TaggingJob): Promise<TaggingJobResult> {
    const { data } = job;
    if ('entityType' in data) {
      return this.processPredict(data);
    }
    return this.processRefine(data);
  }

  private async processPredict(
    data: PredictTaggingJob['data'],
  ): Promise<TaggingJobResult> {
    const isPlan = data.entityType === TAGGING_ENTITY_TYPES.PLAN;
    const entity = isPlan
      ? await this.plansService
          .getRepository()
          .findOne({ where: { id: data.entityId } })
      : await this.tasksService
          .getRepository()
          .findOne({ where: { id: data.entityId } });
    if (entity == null) {
      return { added: 0, removed: 0, skipped: 'entity-missing' };
    }

    const vocabulary = await this.resolveTaggingVocabulary();
    let predictions: TaggingPrediction[];
    try {
      predictions = await this.taggingModelProvider.classify(
        {
          description: entity.description,
          summary: entity.summary,
          title: entity.title,
        },
        vocabulary,
      );
    } catch (error) {
      this.logger.warn(
        `predict-tagging skipped for ${data.entityType} ${data.entityId}: model call failed twice (${
          error instanceof Error ? error.message : String(error)
        })`,
        TaggingProcessor.name,
      );
      return { added: 0, removed: 0, skipped: 'model-failed' };
    }

    const accepted = this.applyVocabularyAndCaps(predictions, vocabulary, {
      includePhase: true,
    });
    const planId =
      isPlan || !('planId' in entity) ? data.entityId : entity.planId;

    const result = await this.reconcileOwnRows(
      data.entityType,
      data.entityId,
      accepted,
      { domainOnly: false },
    );

    if ((result.added > 0 || result.removed > 0) && planId != null) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        planId,
        PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
      );
    }
    return result;
  }

  private async processRefine(
    data: RefineTaggingJob['data'],
  ): Promise<TaggingJobResult> {
    const plan = await this.plansService
      .getRepository()
      .findOne({ where: { id: data.planId } });
    if (plan == null) {
      return { added: 0, removed: 0, skipped: 'plan-missing' };
    }

    const [owner, repoName] = data.repo.split('/');
    if (owner == null || repoName == null || repoName.length === 0) {
      this.logger.warn(
        `refine-tagging skipped for plan ${data.planId}: repo "${data.repo}" is not owner/name`,
        TaggingProcessor.name,
      );
      return { added: 0, removed: 0, skipped: 'bad-repo' };
    }

    // A GitHub transport error throws here on purpose: BullMQ backs off and
    // retries. A null commit (unknown sha) is a permanent skip.
    const commit = await this.githubService.getCommitDetail(
      owner,
      repoName,
      data.sha,
    );
    if (commit == null) {
      this.logger.warn(
        `refine-tagging skipped for plan ${data.planId}: commit ${data.sha} not found in ${data.repo}`,
        TaggingProcessor.name,
      );
      return { added: 0, removed: 0, skipped: 'diff-unavailable' };
    }

    const vocabulary = await this.resolveTaggingVocabulary();
    let predictions: TaggingPrediction[];
    try {
      predictions = await this.taggingModelProvider.classify(
        {
          description: null,
          diff: this.renderDiffExcerpt(commit.message, commit.files),
          summary: null,
          title: plan.title,
        },
        vocabulary,
      );
    } catch (error) {
      this.logger.warn(
        `refine-tagging skipped for plan ${data.planId}: model call failed twice (${
          error instanceof Error ? error.message : String(error)
        })`,
        TaggingProcessor.name,
      );
      return { added: 0, removed: 0, skipped: 'model-failed' };
    }

    const accepted = this.applyVocabularyAndCaps(predictions, vocabulary, {
      includePhase: false,
    });
    const result = await this.reconcileOwnRows(
      TAGGING_ENTITY_TYPES.PLAN,
      data.planId,
      accepted,
      { domainOnly: true },
    );

    if (result.added > 0 || result.removed > 0) {
      await this.planRulesEvaluationService.enqueueEvaluation(
        data.planId,
        PLAN_RULES_TRIGGER_KINDS.TAG_CHANGED,
      );
    }
    return result;
  }

  /**
   * @description Drops out-of-vocabulary (or dimension-mismatched)
   * predictions and enforces the 0–5 domain / ≤1 phase caps, keeping the
   * highest-confidence entries.
   */
  private applyVocabularyAndCaps(
    predictions: readonly TaggingPrediction[],
    vocabulary: readonly TaggingVocabularyEntry[],
    options: { includePhase: boolean },
  ): TaggingPrediction[] {
    const dimensionByTag = new Map(
      vocabulary.map((entry) => [entry.tag, entry.dimension]),
    );
    const known = predictions.filter(
      (prediction) =>
        dimensionByTag.get(prediction.tag) === prediction.dimension,
    );
    const deduped = [...new Map(known.map((p) => [p.tag, p])).values()];
    const byConfidence = [...deduped].sort(
      (a, b) => b.confidence - a.confidence,
    );

    const domain = byConfidence
      .filter((prediction) => prediction.dimension === 'domain')
      .slice(0, TAGGING_MAX_DOMAIN_TAGS);
    if (!options.includePhase) {
      return domain;
    }
    const phase = byConfidence
      .filter((prediction) => prediction.dimension === 'phase')
      .slice(0, 1);
    return [...domain, ...phase];
  }

  /**
   * @description Replace-own-rows reconcile as the tagging identity: add every
   * accepted prediction (idempotent; ladder no-ops against higher-provenance
   * rows), then remove this identity's stale server-llm rows not in the
   * accepted set. Ladder rejections are logged, never forced.
   */
  private async reconcileOwnRows(
    entityType: PredictTaggingJob['data']['entityType'],
    entityId: string,
    accepted: readonly TaggingPrediction[],
    options: { domainOnly: boolean },
  ): Promise<TaggingJobResult> {
    const caller = await this.resolveTaggingCaller();
    const isPlan = entityType === TAGGING_ENTITY_TYPES.PLAN;
    const acceptedTags = new Set(accepted.map((prediction) => prediction.tag));

    let added = 0;
    for (const prediction of accepted) {
      try {
        // Sequential on purpose: phase replacement on plans reads then
        // deletes; concurrent adds would race the ≤1-phase invariant.
        // eslint-disable-next-line no-await-in-loop
        const row = await (isPlan
          ? this.tagsService.addPlanTag(caller, entityId, prediction.tag, {
              confidence: prediction.confidence,
            })
          : this.tagsService.addTaskTag(caller, entityId, prediction.tag, {
              confidence: prediction.confidence,
            }));
        if (row.source === SOURCE_SERVER_LLM) {
          added += 1;
        }
      } catch (error) {
        this.logger.warn(
          `tagging: could not apply "${prediction.tag}" to ${entityType} ${entityId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          TaggingProcessor.name,
        );
      }
    }

    const existing: Array<PlanTag | TaskTag> = isPlan
      ? await this.tagsService
          .getPlanTagsRepository()
          .find({ where: { planId: entityId } })
      : await this.tagsService
          .getTaskTagsRepository()
          .find({ where: { taskId: entityId } });
    const stale = existing.filter(
      (row) =>
        row.source === SOURCE_SERVER_LLM &&
        !acceptedTags.has(row.tag) &&
        (!options.domainOnly || row.dimension === 'domain'),
    );

    let removed = 0;
    for (const row of stale) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const deleted = await (isPlan
          ? this.tagsService.removePlanTag(caller, entityId, row.tag)
          : this.tagsService.removeTaskTag(caller, entityId, row.tag));
        if (deleted) removed += 1;
      } catch (error) {
        this.logger.warn(
          `tagging: could not remove stale "${row.tag}" from ${entityType} ${entityId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          TaggingProcessor.name,
        );
      }
    }

    return { added, removed, skipped: null };
  }

  /**
   * @description The tagging identity: the bootstrapped 'tagging' service
   * account when present (migration 067); the name alone still derives
   * source=server-llm if the row is missing.
   */
  private async resolveTaggingCaller(): Promise<TagCaller> {
    const accounts = await this.serviceAccountsService.findAll();
    const tagging = accounts.find(
      (account) => account.name === TAGGING_SERVICE_ACCOUNT_NAME,
    );
    return {
      principalKind: 'service_account',
      serviceAccountName: TAGGING_SERVICE_ACCOUNT_NAME,
      subjectId: tagging?.id ?? TAGGING_SERVICE_ACCOUNT_NAME,
    };
  }

  /**
   * @description The tagging account's vocabulary: its own user_skill_tags
   * rows when any exist, else the committed dimensioned default.
   */
  private async resolveTaggingVocabulary(): Promise<TaggingVocabularyEntry[]> {
    const caller = await this.resolveTaggingCaller();
    const rows = await this.skillTagsService
      .getRepository()
      .find({ where: { userId: caller.subjectId } });
    if (rows.length > 0) {
      return rows.map((row) => ({ dimension: row.dimension, tag: row.tag }));
    }
    return DEFAULT_TAG_VOCABULARY_SEED.map((entry) => ({
      dimension: entry.dimension,
      tag: entry.tag,
    }));
  }

  private renderDiffExcerpt(
    message: string,
    files: readonly {
      additions: number;
      deletions: number;
      filename: string;
      patch: string | null;
    }[],
  ): string {
    const header = files
      .map((file) => `${file.filename} (+${file.additions}/-${file.deletions})`)
      .join('\n');

    let budget = TAGGING_DIFF_PATCH_BUDGET_CHARS;
    const patches: string[] = [];
    for (const file of files) {
      if (file.patch == null || budget <= 0) continue;
      const excerpt = file.patch.slice(0, budget);
      budget -= excerpt.length;
      patches.push(`--- ${file.filename}\n${excerpt}`);
    }

    return `Commit message: ${message}\n\nChanged files:\n${header}\n\n${patches.join('\n\n')}`;
  }
}
