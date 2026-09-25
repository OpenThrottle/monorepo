import type { TagCount } from '../../types/index.ts';
import type {
  AgentConversationsMetrics,
  PlanRunsMetrics,
  ScheduledAgentJobsMetrics,
  WorkSessionsMetrics,
} from './agent-runs.ts';
import type {
  DisabledAgentClisMetrics,
  FavoriteModelsMetrics,
  ModelTokenUsageMetrics,
} from './models.ts';
import type { PlansMetrics } from './plans.ts';
import type {
  SkillUsageMetrics,
  SkillUsageOutcomeMetrics,
} from './skill-usage.ts';
import type { TasksMetrics } from './tasks.ts';

/**
 * @description `src/index.ts` collects every metric family into one
 * `Readonly<Record<string, unknown>>` bag (see `envelope.ts`'s doc comment: the envelope shape is
 * established and other tasks should not need to reshape it for their own needs). The Markdown
 * renderer needs its fields back, so this module narrows the erased `unknown` back to each
 * family's real interface with a type predicate per family — never an `as` cast, per the repo's
 * code style. Each predicate checks a handful of fields unique to its family; it does not
 * re-validate every field (the value only ever came from this same script's own metric queries).
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasFields(
  value: unknown,
  fields: readonly string[],
): value is Record<string, unknown> {
  return isRecord(value) && fields.every((field) => field in value);
}

/** Narrows `metrics.plans` back to {@link PlansMetrics}. */
export function isPlansMetrics(value: unknown): value is PlansMetrics {
  return hasFields(value, [
    'byCategory',
    'byStatus',
    'lifetimeTotal',
    'zeroTaskPlanCount',
  ]);
}

/** Narrows `metrics.plan_tags` / `metrics.task_tags` back to a {@link TagCount} array. */
export function isTagCountList(value: unknown): value is readonly TagCount[] {
  return Array.isArray(value);
}

/** Narrows `metrics.tasks` back to {@link TasksMetrics}. */
export function isTasksMetrics(value: unknown): value is TasksMetrics {
  return hasFields(value, [
    'byCategory',
    'byStatus',
    'lifetimeTotal',
    'tasksPerPlan',
  ]);
}

/** Narrows `metrics.skill_usage` back to {@link SkillUsageMetrics}. */
export function isSkillUsageMetrics(
  value: unknown,
): value is SkillUsageMetrics {
  return hasFields(value, ['bySkill', 'sessionInvocations', 'totalInWindow']);
}

/** Narrows `metrics.skill_usage_outcomes` back to {@link SkillUsageOutcomeMetrics}. */
export function isSkillUsageOutcomeMetrics(
  value: unknown,
): value is SkillUsageOutcomeMetrics {
  return hasFields(value, [
    'durationsBySkill',
    'eventOutcomeCoverage',
    'outcomeMixOverall',
  ]);
}

/** Narrows `metrics.model_token_usage` back to {@link ModelTokenUsageMetrics}. */
export function isModelTokenUsageMetrics(
  value: unknown,
): value is ModelTokenUsageMetrics {
  return hasFields(value, [
    'byModel',
    'byProvider',
    'cacheHitRatio',
    'invocationCountInWindow',
  ]);
}

/** Narrows `metrics.favorite_models` back to {@link FavoriteModelsMetrics}. */
export function isFavoriteModelsMetrics(
  value: unknown,
): value is FavoriteModelsMetrics {
  return hasFields(value, ['byBackendModel', 'totalFavorites']);
}

/** Narrows `metrics.disabled_agent_clis` back to {@link DisabledAgentClisMetrics}. */
export function isDisabledAgentClisMetrics(
  value: unknown,
): value is DisabledAgentClisMetrics {
  return hasFields(value, ['byBackendModel', 'totalDisables']);
}

/** Narrows `metrics.plan_runs` back to {@link PlanRunsMetrics}. */
export function isPlanRunsMetrics(value: unknown): value is PlanRunsMetrics {
  return hasFields(value, [
    'byBackendKindStatus',
    'runsPerPlan',
    'successRateByBackend',
    'totalInWindow',
  ]);
}

/** Narrows `metrics.work_sessions` back to {@link WorkSessionsMetrics}. */
export function isWorkSessionsMetrics(
  value: unknown,
): value is WorkSessionsMetrics {
  return hasFields(value, ['byToolVersionModel', 'totalInWindow']);
}

/** Narrows `metrics.agent_conversations` back to {@link AgentConversationsMetrics}. */
export function isAgentConversationsMetrics(
  value: unknown,
): value is AgentConversationsMetrics {
  return hasFields(value, [
    'conversationCountInWindow',
    'messagesPerConversation',
  ]);
}

/** Narrows `metrics.scheduled_agent_jobs` back to {@link ScheduledAgentJobsMetrics}. */
export function isScheduledAgentJobsMetrics(
  value: unknown,
): value is ScheduledAgentJobsMetrics {
  return hasFields(value, ['activeJobCount', 'runStatusMix', 'runsInWindow']);
}
