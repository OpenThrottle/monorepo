import type { ClassProvider, DynamicModule, Provider } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { NestjsAuthModule } from '@openthrottle/nestjs-auth';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import {
  isBullBoardEnabled,
  NestjsBullmqBoardModule,
} from '@openthrottle/nestjs-bullmq-board';
import { GithubGraphqlModule } from '@openthrottle/nestjs-github';
import {
  isGraphqlWsContext,
  NestjsGraphqlModule,
  PubSubModule,
  resolveGraphqlWsUserId,
} from '@openthrottle/nestjs-graphql';
import { NestjsLoggingModule } from '@openthrottle/nestjs-logging';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsProfilingModule } from '@openthrottle/nestjs-profiling';
import { NestjsRbacModule } from '@openthrottle/nestjs-rbac';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsThrottlerModule } from '@openthrottle/nestjs-throttler';
import { EmitNotificationInterceptor } from '@openthrottle/nestjs-websockets';

import { GlobalClsAuthHook } from './auth/global-cls-auth-hook.service.ts';
import { ServiceAccountAuthService } from './auth/service-account-auth.service.ts';
import {
  getOpenthrottleServerDevJsonlLogDirectory,
  isOpenthrottleServerDevJsonlLoggingEnabled,
} from './config/openthrottle-server-dev-jsonl-logging.ts';
import type { ProcessRole } from './config/process-role.ts';
import { PROCESS_ROLES } from './config/process-role.ts';
import { ActivityGraphqlModule } from './graphql/activity/activity-graphql.module.ts';
import { AgentConversationsGraphqlModule } from './graphql/agent-conversations/agent-conversations-graphql.module.ts';
import { AgentDiscoveryGraphqlModule } from './graphql/agent-discovery/agent-discovery-graphql.module.ts';
import { AgentSetupGraphqlModule } from './graphql/agent-setup/agent-setup-graphql.module.ts';
import { AgenticWorkflowGraphqlModule } from './graphql/agentic-workflow/agentic-workflow-graphql.module.ts';
import { AgentsGraphqlModule } from './graphql/agents/agents-graphql.module.ts';
import { AuthGraphqlModule } from './graphql/auth/auth-graphql.module.ts';
import { CodeSearchGraphqlModule } from './graphql/code-search/code-search-graphql.module.ts';
import { ConversationStreamGraphqlModule } from './graphql/conversation-stream/conversation-stream-graphql.module.ts';
import { DailyStatsGraphqlModule } from './graphql/daily-stats/daily-stats-graphql.module.ts';
import { EditorPresenceGraphqlModule } from './graphql/editor-presence/editor-presence-graphql.module.ts';
import { GeneratorsGraphqlModule } from './graphql/generators/generators-graphql.module.ts';
import { HealthGraphqlModule } from './graphql/health/health-graphql.module.ts';
import { McpConnectorsGraphqlModule } from './graphql/mcp-connectors/mcp-connectors-graphql.module.ts';
import { MetricsGraphqlModule } from './graphql/metrics/metrics-graphql.module.ts';
import { ModelDiscoveryGraphqlModule } from './graphql/model-discovery/model-discovery-graphql.module.ts';
import { NotesGraphqlModule } from './graphql/notes/notes-graphql.module.ts';
import { NOTIFICATION_EVENT_TYPES } from './graphql/notifications/notification-event.object.ts';
import { NotificationsGraphqlModule } from './graphql/notifications/notifications-graphql.module.ts';
import { PlanEmbeddingsGraphqlModule } from './graphql/plan-embeddings/plan-embeddings-graphql.module.ts';
import { PlanOutputStreamGraphqlModule } from './graphql/plan-output-stream/plan-output-stream-graphql.module.ts';
import { PlansGraphqlModule } from './graphql/plans/plans-graphql.module.ts';
import { ProjectSkillsGraphqlModule } from './graphql/project-skills/project-skills-graphql.module.ts';
import { ProjectsGraphqlModule } from './graphql/projects/projects-graphql.module.ts';
import { CustomPromptsGraphqlModule } from './graphql/prompts/custom-prompts-graphql.module.ts';
import { QueueJobLogsGraphqlModule } from './graphql/queue-job-logs/queue-job-logs-graphql.module.ts';
import { QueuesGraphqlModule } from './graphql/queues/queues-graphql.module.ts';
import { RepositoryInspectionModule } from './graphql/repository-inspection/repository-inspection.module.ts';
import { RolesGraphqlModule } from './graphql/roles/roles-graphql.module.ts';
import { RolloutGraphqlModule } from './graphql/rollout/rollout-graphql.module.ts';
import { ScheduledAgentJobsGraphqlModule } from './graphql/scheduled-agent-jobs/scheduled-agent-jobs-graphql.module.ts';
import { SearchGraphqlModule } from './graphql/search/search-graphql.module.ts';
import { ServiceAccountsGraphqlModule } from './graphql/service-accounts/service-accounts-graphql.module.ts';
import { SkillAvailabilityGraphqlModule } from './graphql/skill-availability/skill-availability-graphql.module.ts';
import { SkillTagsGraphqlModule } from './graphql/skill-tags/skill-tags-graphql.module.ts';
import { SkillUsageGraphqlModule } from './graphql/skill-usage/skill-usage-graphql.module.ts';
import { TagActionRulesGraphqlModule } from './graphql/tag-action-rules/tag-action-rules-graphql.module.ts';
import { TagsGraphqlModule } from './graphql/tags/tags-graphql.module.ts';
import { TaskEmbeddingsGraphqlModule } from './graphql/task-embeddings/task-embeddings-graphql.module.ts';
import { TasksGraphqlModule } from './graphql/tasks/tasks-graphql.module.ts';
import { TimelineGraphqlModule } from './graphql/timeline/timeline-graphql.module.ts';
import { TokenUsageGraphqlModule } from './graphql/token-usage/token-usage-graphql.module.ts';
import { TranscriptionStreamGraphqlModule } from './graphql/transcription-stream/transcription-stream-graphql.module.ts';
import { UsersGraphqlModule } from './graphql/users/users-graphql.module.ts';
import { WorkLedgerGraphqlModule } from './graphql/work-ledger/work-ledger-graphql.module.ts';
import { WorkspaceSettingsGraphqlModule } from './graphql/workspace-settings/workspace-settings-graphql.module.ts';
import { GlobalAuthGuard } from './guards/global-auth.guard.ts';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard.ts';
import { MetricsModule } from './metrics/metrics.module.ts';
import { CspReportsModule } from './modules/csp-reports/csp-reports.module.ts';
import { DevelopmentModule } from './modules/development/development.module.ts';
import { GeneratorsModule } from './modules/generators/generators.module.ts';
import { HealthModule } from './modules/health/health.module.ts';
import { McpDeveloperModule } from './modules/mcp-developer/mcp-developer.module.ts';
import { NotificationsModule } from './notifications/notifications.module.ts';
import { AgenticTestQueueModule } from './queues/agentic-test/agentic-test-queue.module.ts';
import { BullMqRunOutputModule } from './queues/bullmq-run-output.module.ts';
import { CodeIndexQueueModule } from './queues/code-index/code-index-queue.module.ts';
import { DailyStatsQueueModule } from './queues/daily-stats/daily-stats-queue.module.ts';
import { DataRetentionQueueModule } from './queues/data-retention/data-retention-queue.module.ts';
import { DatabaseBackupQueueModule } from './queues/database-backup/database-backup-queue.module.ts';
import { DocIngestionQueueModule } from './queues/doc-ingestion/doc-ingestion-queue.module.ts';
import { PlanLifecycleHooksQueueModule } from './queues/plan-lifecycle-hooks/plan-lifecycle-hooks-queue.module.ts';
import { PlanRulesQueueModule } from './queues/plan-rules/plan-rules-queue.module.ts';
import { PlanRunsStaleSweepQueueModule } from './queues/plan-runs-stale-sweep/plan-runs-stale-sweep-queue.module.ts';
import { PlansQueueModule } from './queues/plans/plans-queue.module.ts';
import { ScheduledAgentJobsQueueModule } from './queues/scheduled-agent-jobs/scheduled-agent-jobs-queue.module.ts';
import { TaggingQueueModule } from './queues/tagging/tagging-queue.module.ts';
import { TaskPromotionQueueModule } from './queues/task-promotion/task-promotion-queue.module.ts';
import { WorkLedgerSweepQueueModule } from './queues/work-ledger-sweep/work-ledger-sweep-queue.module.ts';
import { WorkLedgerVerifyQueueModule } from './queues/work-ledger-verify/work-ledger-verify-queue.module.ts';

type AppModuleImports = NonNullable<DynamicModule['imports']>;

/**
 * `multi` + `useClass` on the `APP_INTERCEPTOR` token is a runtime-valid Nest
 * pattern, but `ClassProvider` does not declare `multi` (only factory-style
 * providers do), so widen the annotation to permit it without an assertion.
 */
const emitNotificationInterceptorProvider: ClassProvider & {
  multi?: boolean;
} = {
  multi: true,
  provide: APP_INTERCEPTOR,
  useClass: EmitNotificationInterceptor,
};

const appProviders: Provider[] = [
  GlobalClsAuthHook,
  GlobalAuthGuard,
  GqlJwtAuthGuard,
  ServiceAccountAuthService,
  {
    provide: APP_GUARD,
    useClass: GlobalAuthGuard,
  },
  emitNotificationInterceptorProvider,
];

/**
 * @description Builds the role-sliced imports list.
 *
 * ORDER MATTERS twice over:
 * - The code-first GraphQL schema (schema.gql) lists Query/Mutation fields in
 *   resolver registration order, which follows this import order — including
 *   transitive imports (e.g. HealthModule → HealthGraphqlModule registers the
 *   health resolvers long before the explicit GraphQL list). Reorder and CI's
 *   schema-drift check fails.
 * - Registration order is only stable for STATIC `@Module` classes (their
 *   imports are scanned depth-first from reflect metadata). A dynamic-module
 *   root scans level-order and reorders the schema — that's why
 *   {@link buildAppModule} returns one of three static classes instead of a
 *   DynamicModule.
 *
 * Role slices: `api` drops the BullMQ WorkerHost processor modules (so editing
 * API code never restarts a process that is mid-job or detaches its debugger),
 * `worker` drops the HTTP/GraphQL surface; producer halves (registerQueue)
 * load wherever they're needed via the importing modules. Worker-only modules
 * host no resolvers, so `api` and `all` generate byte-identical schemas.
 */
const buildImports = (role: ProcessRole): AppModuleImports => {
  const isApiLike = role !== PROCESS_ROLES.worker;
  const isWorkerLike = role !== PROCESS_ROLES.api;

  return [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
    }),

    BullMqRunOutputModule,
    GlobalClsModule,
    HealthModule,
    LoggerModule,
    MetricsModule,
    NestjsAuthModule.forRoot(),
    NestjsBullmqModule,

    // The Bull Board dashboard exposes job payloads, queue internals, and
    // retry/remove/clean actions behind only a single static basic-auth
    // credential. Keep it out of production; mount the UI only outside prod.
    NestjsBullmqBoardModule.forRoot({
      enabled: isBullBoardEnabled(),
    }),
    ...(isApiLike
      ? [
          NestjsGraphqlModule.forRoot({
            // Subscriptions return the NotificationEvent interface, so its
            // concrete implementing types are orphaned — register them
            // explicitly so they make it into the schema.
            buildSchemaOptions: {
              orphanedTypes: [...NOTIFICATION_EVENT_TYPES],
            },
            cachePlugins: {
              cacheControl: true,
              responseCache: true,
            },
            // HTTP requests carry identity on `req` (set by the global auth
            // guard). graphql-ws subscriptions carry it on the connection:
            // onConnect validated the token and stashed the user id on
            // `extra`, so surface it as `userId`.
            context: (ctx: { req?: unknown }) =>
              isGraphqlWsContext(ctx)
                ? { req: undefined, userId: resolveGraphqlWsUserId(ctx) }
                : { req: ctx.req },
          }),
        ]
      : []),
    NestjsProfilingModule,
    NestjsRbacModule,
    NestjsRepositoriesModule,
    NestjsThrottlerModule,
    NotificationsModule,
    PubSubModule,
    ...(isOpenthrottleServerDevJsonlLoggingEnabled()
      ? [
          NestjsLoggingModule.forRoot({
            fileBasename: 'openthrottle-server',
            isGlobal: true,
            logDirectory: getOpenthrottleServerDevJsonlLogDirectory(),
            websocket: {
              enabled: true,
              namespace: '/openthrottle-server',
            },
          }),
        ]
      : []),

    // 🧩 Application Modules (queue processors are worker/all; HTTP-facing
    // modules are api/all — interleaved to preserve the pre-split order)
    ...(isWorkerLike
      ? [
          AgenticTestQueueModule,
          CodeIndexQueueModule,
          CspReportsModule,
          DailyStatsQueueModule,
          DatabaseBackupQueueModule,
          DataRetentionQueueModule,
        ]
      : []),
    ...(isApiLike ? [DevelopmentModule] : []),
    ...(isWorkerLike ? [DocIngestionQueueModule] : []),
    ...(isApiLike ? [GeneratorsModule, McpDeveloperModule] : []),
    ...(isWorkerLike
      ? [
          PlanLifecycleHooksQueueModule,
          PlanRulesQueueModule,
          PlanRunsStaleSweepQueueModule,
          PlansQueueModule,
          ScheduledAgentJobsQueueModule,
          TaggingQueueModule,
          TaskPromotionQueueModule,
          WorkLedgerSweepQueueModule,
          WorkLedgerVerifyQueueModule,
        ]
      : []),

    // 🧩 GraphQL Modules
    ...(isApiLike
      ? [
          ActivityGraphqlModule,
          AgenticWorkflowGraphqlModule,
          AgentConversationsGraphqlModule,
          AgentDiscoveryGraphqlModule,
          AgentSetupGraphqlModule,
          AgentsGraphqlModule,
          AuthGraphqlModule,
          CodeSearchGraphqlModule,
          ConversationStreamGraphqlModule,
          CustomPromptsGraphqlModule,
          DailyStatsGraphqlModule,
          EditorPresenceGraphqlModule,
          GeneratorsGraphqlModule,
          GithubGraphqlModule,
          HealthGraphqlModule,
          McpConnectorsGraphqlModule,
          MetricsGraphqlModule,
          ModelDiscoveryGraphqlModule,
          NotesGraphqlModule,
          NotificationsGraphqlModule,
          PlanEmbeddingsGraphqlModule,
          PlanOutputStreamGraphqlModule,
          PlansGraphqlModule,
          ProjectSkillsGraphqlModule,
          ProjectsGraphqlModule,
          QueueJobLogsGraphqlModule,
          QueuesGraphqlModule,
          RepositoryInspectionModule,
          RolesGraphqlModule,
          RolloutGraphqlModule,
          ScheduledAgentJobsGraphqlModule,
          ServiceAccountsGraphqlModule,
          SearchGraphqlModule,
          SkillAvailabilityGraphqlModule,
          SkillTagsGraphqlModule,
          SkillUsageGraphqlModule,
          TagActionRulesGraphqlModule,
          TagsGraphqlModule,
          TaskEmbeddingsGraphqlModule,
          TasksGraphqlModule,
          TimelineGraphqlModule,
          TokenUsageGraphqlModule,
          TranscriptionStreamGraphqlModule,
          UsersGraphqlModule,
          WorkLedgerGraphqlModule,
          WorkspaceSettingsGraphqlModule,
        ]
      : []),
  ];
};

/**
 * @description The historical single-process composition (PROCESS_ROLE=all).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.all),
  providers: appProviders,
})
export class AppModule {}

/**
 * @description HTTP/GraphQL + queue producers, no BullMQ processors
 * (PROCESS_ROLE=api).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.api),
  providers: appProviders,
})
export class ApiAppModule {}

/**
 * @description BullMQ processors only, no HTTP/GraphQL surface
 * (PROCESS_ROLE=worker).
 */
@Module({
  imports: buildImports(PROCESS_ROLES.worker),
  providers: appProviders,
})
export class WorkerAppModule {}

/**
 * @description Role-gated composition root consumed by the single `main.ts`
 * bootstrap (no duplicate worker entrypoint). Returns a STATIC module class —
 * see {@link buildImports} for why a DynamicModule would reorder the schema.
 */
export const buildAppModule = ({
  role,
}: {
  role: ProcessRole;
}): typeof AppModule | typeof ApiAppModule | typeof WorkerAppModule => {
  if (role === PROCESS_ROLES.api) {
    return ApiAppModule;
  }

  if (role === PROCESS_ROLES.worker) {
    return WorkerAppModule;
  }

  return AppModule;
};
