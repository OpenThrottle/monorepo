/**
 * @description Builds TypeORM DataSource options for Postgres from POSTGRES_URL or POSTGRES_* env vars.
 * Used by NestjsRepositoriesModule to register TypeORM with Cortex connection.
 */

import type { DataSourceOptions } from 'typeorm';
import { AgentConversationMessage } from './modules/agent-conversations/agent-conversation-message.entity';
import { AgentConversation } from './modules/agent-conversations/agent-conversation.entity';
import { CommitLink } from './modules/commit-links/commit-link.entity';
import { CustomPrompt } from './modules/prompts/custom-prompt.entity';
import { DailyStat } from './modules/daily-stats/daily-stat.entity';
import { getPostgresUrl } from '@openthrottle/openthrottle-agentic-utils';
import { Note } from './modules/notes/note.entity';
import { Permission } from './modules/roles/permission.entity';
import { Plan } from './modules/plans/plan.entity';
import { PlanEmbedding } from './modules/plan-embeddings/plan-embedding.entity';
import { PlanOutputStreamChunk } from './modules/plan-output-stream/plan-output-stream.entity';
import { PlanRun } from './modules/plan-runs/plan-run.entity';
import { Project } from './modules/projects/project.entity';
import { Role } from './modules/roles/role.entity';
import { ServiceAccount } from './modules/service-accounts/service-account.entity';
import { ServiceAccountCredential } from './modules/service-accounts/service-account-credential.entity';
import { Subscription } from './modules/subscriptions/subscription.entity';
import { Task } from './modules/tasks/task.entity';
import { TaskEmbedding } from './modules/task-embeddings/task-embedding.entity';
import { User } from './modules/users/user.entity';
import { UserWorkspaceSettings } from './modules/workspace-settings/user-workspace-settings.entity';
import { WorkspaceLocalRepository } from './modules/workspace-settings/workspace-local-repository.entity';

/**
 * @description Returns TypeORM DataSource options for Cortex. Use when registering TypeOrmModule (e.g. forRootAsync).
 */
export function getTypeOrmOptions(): DataSourceOptions {
  return {
    entities: [
      AgentConversation,
      AgentConversationMessage,
      CommitLink,
      CustomPrompt,
      DailyStat,
      Note,
      Permission,
      Plan,
      PlanEmbedding,
      PlanOutputStreamChunk,
      PlanRun,
      Project,
      Role,
      ServiceAccount,
      ServiceAccountCredential,
      Subscription,
      Task,
      TaskEmbedding,
      User,
      UserWorkspaceSettings,
      WorkspaceLocalRepository,
    ],
    logging: process.env.NODE_ENV === 'development',
    type: 'postgres',
    url: getPostgresUrl(),
  };
}
