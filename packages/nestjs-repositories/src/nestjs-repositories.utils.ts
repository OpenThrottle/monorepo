/**
 * @description Builds TypeORM DataSource options for Postgres from POSTGRES_URL or POSTGRES_* env vars.
 * Used by NestjsRepositoriesModule to register TypeORM with OpenThrottle connection.
 */

import {
  BlogAuthor,
  BlogPost,
  BlogTag,
  CodeEmbedding,
  CodeIndexSnapshot,
  DailyStat,
  McpConnectorConnection,
  Note,
  Plan,
  PlanEmbedding,
  PlanOutputStreamChunk,
  Project,
  SkillUsageEvent,
  SkillUsageOutcome,
  Task,
  TaskEmbedding,
  TelemetryHeartbeat,
  UserDisabledAgentCli,
  UserFavoriteAgentModel,
  WorktreeRemoval,
} from '@openthrottle/nestjs-repositories-server';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import type { DataSourceOptions } from 'typeorm';

import { AgentAccount } from './modules/agent-accounts/agent-accounts.entity.ts';
import { AgentConversation } from './modules/agent-conversations/agent-conversation.entity.ts';
import { AgentConversationMessage } from './modules/agent-conversations/agent-conversation-message.entity.ts';
import { AgentTokenUsage } from './modules/agent-token-usage/agent-token-usage.entity.ts';
import { AgentTrajectory } from './modules/agent-trajectories/agent-trajectory.entity.ts';
import { EvalCase } from './modules/eval-datasets/eval-case.entity.ts';
import { EvalDataset } from './modules/eval-datasets/eval-dataset.entity.ts';
import { EvalHumanLabel } from './modules/eval-human-labels/eval-human-label.entity.ts';
import { EvalJudgeCalibration } from './modules/eval-judge-calibrations/eval-judge-calibration.entity.ts';
import { EvalGrade } from './modules/eval-runs/eval-grade.entity.ts';
import { EvalRun } from './modules/eval-runs/eval-run.entity.ts';
import { EvalTrial } from './modules/eval-runs/eval-trial.entity.ts';
import { PlanMessage } from './modules/plan-messages/plan-message.entity.ts';
import { PlanRun } from './modules/plan-runs/plan-run.entity.ts';
import { ProjectSkill } from './modules/project-skills/project-skill.entity.ts';
import { CustomPrompt } from './modules/prompts/custom-prompt.entity.ts';
import { Repository } from './modules/repositories/repository.entity.ts';
import { RepositoryCheckout } from './modules/repositories/repository-checkout.entity.ts';
import { Permission } from './modules/roles/permission.entity.ts';
import { Role } from './modules/roles/role.entity.ts';
import { ScheduledAgentJob } from './modules/scheduled-agent-jobs/scheduled-agent-job.entity.ts';
import { ScheduledAgentJobRun } from './modules/scheduled-agent-jobs/scheduled-agent-job-run.entity.ts';
import { ServiceAccount } from './modules/service-accounts/service-account.entity.ts';
import { ServiceAccountCredential } from './modules/service-accounts/service-account-credential.entity.ts';
import { SkillAvailabilityRule } from './modules/skill-availability/skill-availability-rule.entity.ts';
import { SkillAvailabilityRuleSet } from './modules/skill-availability/skill-availability-rule-set.entity.ts';
import { UserSkillTag } from './modules/skill-tags/user-skill-tag.entity.ts';
import { Subscription } from './modules/subscriptions/subscription.entity.ts';
import { RuleApplication } from './modules/tag-action-rules/rule-application.entity.ts';
import { TagActionRule } from './modules/tag-action-rules/tag-action-rule.entity.ts';
import { PlanTag } from './modules/tags/plan-tag.entity.ts';
import { ProjectTag } from './modules/tags/project-tag.entity.ts';
import { TaskTag } from './modules/tags/task-tag.entity.ts';
import { UserPreferences } from './modules/user-preferences/user-preferences.entity.ts';
import { User } from './modules/users/user.entity.ts';
import { WorkArtifact } from './modules/work-ledger/work-artifact.entity.ts';
import { WorkSession } from './modules/work-ledger/work-session.entity.ts';
import { WorkSessionSubject } from './modules/work-ledger/work-session-subject.entity.ts';
import { UserWorkspaceSettings } from './modules/workspace-settings/user-workspace-settings.entity.ts';

/**
 * @description Resolves a positive integer from an env var, or undefined when
 * unset/blank/invalid. Used for the optional slow-query threshold.
 */
function parsePositiveIntEnv(raw: string | undefined): number | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
}

/**
 * @description Returns TypeORM DataSource options for OpenThrottle. Use when registering TypeOrmModule (e.g. forRootAsync).
 *
 * Logging: full SQL logging stays gated to development. In any env, setting
 * `POSTGRES_SLOW_QUERY_MS` to a positive integer sets `maxQueryExecutionTime`,
 * so TypeORM logs a `query is slow` warning for queries exceeding the threshold
 * (slow-query logging is emitted independently of the `logging` level) — a
 * production-safe DX hook for latency investigations.
 */
export function getTypeOrmOptions(): DataSourceOptions {
  const slowQueryMs = parsePositiveIntEnv(process.env.POSTGRES_SLOW_QUERY_MS);

  return {
    entities: [
      AgentAccount,
      AgentConversation,
      AgentConversationMessage,
      AgentTokenUsage,
      AgentTrajectory,
      CodeEmbedding,
      CodeIndexSnapshot,
      CustomPrompt,
      EvalCase,
      EvalDataset,
      EvalGrade,
      EvalHumanLabel,
      EvalJudgeCalibration,
      EvalRun,
      EvalTrial,
      McpConnectorConnection,
      // Moved to nestjs-repositories-server (OT plan 052d37b0); listed here until the DataSource moves too.
      BlogAuthor,
      BlogPost,
      BlogTag,
      DailyStat,
      Note,
      Permission,
      Plan,
      PlanEmbedding,
      PlanMessage,
      PlanOutputStreamChunk,
      PlanRun,
      PlanTag,
      Project,
      ProjectSkill,
      ProjectTag,
      Repository,
      RepositoryCheckout,
      Role,
      RuleApplication,
      ScheduledAgentJob,
      ScheduledAgentJobRun,
      ServiceAccount,
      ServiceAccountCredential,
      SkillAvailabilityRule,
      SkillAvailabilityRuleSet,
      SkillUsageEvent,
      SkillUsageOutcome,
      Subscription,
      TagActionRule,
      Task,
      TaskEmbedding,
      TaskTag,
      User,
      UserDisabledAgentCli,
      UserFavoriteAgentModel,
      TelemetryHeartbeat,
      UserPreferences,
      UserSkillTag,
      UserWorkspaceSettings,
      WorkArtifact,
      WorkSession,
      WorkSessionSubject,
      WorktreeRemoval,
    ],

    // logger?: "advanced-console" | "simple-console" | "formatted-console" | "file" | "debug" | Logger;
    logger: 'advanced-console',

    // logging: ['query', 'schema', 'error', 'warn', 'info', 'log', 'migration'],
    logging: ['error', 'warn', 'info'],
    // logging: getPostgresLoggingLevel(),

    ...(slowQueryMs != null && { maxQueryExecutionTime: slowQueryMs }),
    type: 'postgres',
    url: getPostgresUrl(),
  };
}
