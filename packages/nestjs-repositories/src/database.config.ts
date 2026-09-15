/**
 * @description Builds TypeORM DataSource options for Postgres from POSTGRES_URL or POSTGRES_* env vars.
 * Used by NestjsRepositoriesModule to register TypeORM with OpenThrottle connection.
 */

import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import type { DataSourceOptions } from 'typeorm';

import { UserDisabledAgentCli } from './modules/agent-cli-preferences/user-disabled-agent-cli.entity.ts';
import { UserFavoriteAgentModel } from './modules/agent-cli-preferences/user-favorite-agent-model.entity.ts';
import { AgentConversation } from './modules/agent-conversations/agent-conversation.entity.ts';
import { AgentConversationMessage } from './modules/agent-conversations/agent-conversation-message.entity.ts';
import { AgentTokenUsage } from './modules/agent-token-usage/agent-token-usage.entity.ts';
import { CodeEmbedding } from './modules/code-embeddings/code-embedding.entity.ts';
import { CodeIndexSnapshot } from './modules/code-index-snapshots/code-index-snapshot.entity.ts';
import { DailyStat } from './modules/daily-stats/daily-stat.entity.ts';
import { McpConnectorConnection } from './modules/mcp-connectors/mcp-connector-connection.entity.ts';
import { Note } from './modules/notes/note.entity.ts';
import { PlanEmbedding } from './modules/plan-embeddings/plan-embedding.entity.ts';
import { PlanOutputStreamChunk } from './modules/plan-output-stream/plan-output-stream.entity.ts';
import { PlanRun } from './modules/plan-runs/plan-run.entity.ts';
import { Plan } from './modules/plans/plan.entity.ts';
import { ProjectSkill } from './modules/project-skills/project-skill.entity.ts';
import { Project } from './modules/projects/project.entity.ts';
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
import { SkillUsageEvent } from './modules/skill-usage-events/skill-usage-events.entity.ts';
import { SkillUsageOutcome } from './modules/skill-usage-events/skill-usage-outcomes.entity.ts';
import { Subscription } from './modules/subscriptions/subscription.entity.ts';
import { RuleApplication } from './modules/tag-action-rules/rule-application.entity.ts';
import { TagActionRule } from './modules/tag-action-rules/tag-action-rule.entity.ts';
import { PlanTag } from './modules/tags/plan-tag.entity.ts';
import { ProjectTag } from './modules/tags/project-tag.entity.ts';
import { TaskTag } from './modules/tags/task-tag.entity.ts';
import { TaskEmbedding } from './modules/task-embeddings/task-embedding.entity.ts';
import { Task } from './modules/tasks/task.entity.ts';
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
      AgentConversation,
      AgentConversationMessage,
      AgentTokenUsage,
      CodeEmbedding,
      CodeIndexSnapshot,
      CustomPrompt,
      DailyStat,
      McpConnectorConnection,
      Note,
      Permission,
      Plan,
      PlanEmbedding,
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
      UserSkillTag,
      UserWorkspaceSettings,
      WorkArtifact,
      WorkSession,
      WorkSessionSubject,
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
