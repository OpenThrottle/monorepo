/**
 * @description Builds TypeORM DataSource options for Postgres from POSTGRES_URL or POSTGRES_* env vars.
 * Used by NestjsRepositoriesModule to register TypeORM with Cortex connection.
 */

import type { DataSourceOptions } from 'typeorm';
import { CommitLink } from './modules/commit-links/commit-link.entity';
import { CustomPrompt } from './modules/prompts/custom-prompt.entity';
import { DailyStat } from './modules/daily-stats/daily-stat.entity';
import { Note } from './modules/notes/note.entity';
import { Plan } from './modules/plans/plan.entity';
import { PlanEmbedding } from './modules/plan-embeddings/plan-embedding.entity';
import { PlanOutputStreamChunk } from './modules/plan-output-stream/plan-output-stream.entity';
import { Permission } from './modules/roles/permission.entity';
import { Role } from './modules/roles/role.entity';
import { Project } from './modules/projects/project.entity';
import { Subscription } from './modules/subscriptions/subscription.entity';
import { Task } from './modules/tasks/task.entity';
import { TaskEmbedding } from './modules/task-embeddings/task-embedding.entity';
import { User } from './modules/users/user.entity';

// import { getPostgresUrl } from '@openthrottle/openthrottle-postgres';

/**
 * @description Returns Cortex Postgres URL from POSTGRES_URL or POSTGRES_* env vars.
 * Same resolution as TypeORM registration; use for nested `workflow-ralph` env so spawns match the server DataSource.
 */
export function getCortexPostgresUrl(): string {
  const url = process.env.POSTGRES_URL?.trim();

  if (url) return url;

  const db = process.env.POSTGRES_DB;
  const host = process.env.POSTGRES_HOST;
  const password = process.env.POSTGRES_PASSWORD;
  const user = process.env.POSTGRES_USER;
  const port = process.env.POSTGRES_PORT
    ? Number(process.env.POSTGRES_PORT)
    : '6010';

  if (!db || !host || !password || !port || !user) {
    const message = `🚨 Postgres database is unreachable. Set POSTGRES_URL or POSTGRES_* env vars.`;

    throw new Error(message);
  }

  const encodedPassword = encodeURIComponent(password);

  return `postgresql://${user}:${encodedPassword}@${host}:${port}/${db}`;
}

/**
 * @description Returns TypeORM DataSource options for Cortex. Use when registering TypeOrmModule (e.g. forRootAsync).
 */
export function getTypeOrmOptions(): DataSourceOptions {
  return {
    entities: [
      CommitLink,
      CustomPrompt,
      DailyStat,
      Note,
      Permission,
      Plan,
      PlanEmbedding,
      PlanOutputStreamChunk,
      Project,
      Role,
      Subscription,
      Task,
      TaskEmbedding,
      User,
    ],
    logging: process.env.NODE_ENV === 'development',
    type: 'postgres',
    url: getCortexPostgresUrl(),
  };
}
