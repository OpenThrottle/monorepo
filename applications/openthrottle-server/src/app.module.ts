import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EmitNotificationInterceptor } from '@openthrottle/nestjs-websockets';
import { GithubGraphqlModule } from '@openthrottle/nestjs-github';
import { GlobalClsModule } from '@openthrottle/nestjs-modules';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { NestjsAuthModule } from '@openthrottle/nestjs-auth';
import {
  isBullBoardEnabled,
  NestjsBullmqBoardModule,
} from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import {
  NestjsGraphqlModule,
  PubSubModule,
  isGraphqlWsContext,
  resolveGraphqlWsUserId,
} from '@openthrottle/nestjs-graphql';
import { NestjsLoggingModule } from '@openthrottle/nestjs-logging';
import { NestjsProfilingModule } from '@openthrottle/nestjs-profiling';
import { NestjsRbacModule } from '@openthrottle/nestjs-rbac';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { NestjsThrottlerModule } from '@openthrottle/nestjs-throttler';
import type { ClassProvider, DynamicModule, Provider } from '@nestjs/common';
import {
  getOpenthrottleServerDevJsonlLogDirectory,
  isOpenthrottleServerDevJsonlLoggingEnabled,
} from './config/openthrottle-server-dev-jsonl-logging';
import { PROCESS_ROLES } from './config/process-role';
import type { ProcessRole } from './config/process-role';
import { AgenticTestQueueModule } from './queues/agentic-test/agentic-test-queue.module';
import { ActivityGraphqlModule } from './graphql/activity/activity-graphql.module';
import { AgenticWorkflowGraphqlModule } from './graphql/agentic-workflow/agentic-workflow-graphql.module';
import { AgentConversationsGraphqlModule } from './graphql/agent-conversations/agent-conversations-graphql.module';
import { AgentDiscoveryGraphqlModule } from './graphql/agent-discovery/agent-discovery-graphql.module';
import { AgentsGraphqlModule } from './graphql/agents/agents-graphql.module';
import { AuthGraphqlModule } from './graphql/auth/auth-graphql.module';
import { CodeIndexQueueModule } from './queues/code-index/code-index-queue.module';
import { CodeSearchGraphqlModule } from './graphql/code-search/code-search-graphql.module';
import { CommitLinksGraphqlModule } from './graphql/commit-links/commit-links-graphql.module';
import { ConversationStreamGraphqlModule } from './graphql/conversation-stream/conversation-stream-graphql.module';
import { CspReportsModule } from './modules/csp-reports/csp-reports.module';
import { CustomPromptsGraphqlModule } from './graphql/prompts/custom-prompts-graphql.module';
import { DailyStatsGraphqlModule } from './graphql/daily-stats/daily-stats-graphql.module';
import { DailyStatsQueueModule } from './queues/daily-stats/daily-stats-queue.module';
import { DatabaseBackupQueueModule } from './queues/database-backup/database-backup-queue.module';
import { DevelopmentModule } from './modules/development/development.module';
import { DocIngestionQueueModule } from './queues/doc-ingestion/doc-ingestion-queue.module';
import { GeneratorsGraphqlModule } from './graphql/generators/generators-graphql.module';
import { GeneratorsModule } from './modules/generators/generators.module';
import { GlobalClsAuthHook } from './auth/global-cls-auth-hook.service';
import { ServiceAccountAuthService } from './auth/service-account-auth.service';
import { GlobalAuthGuard } from './guards/global-auth.guard';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard';
import { HealthGraphqlModule } from './graphql/health/health-graphql.module';
import { HealthModule } from './modules/health/health.module';
import { McpDeveloperModule } from './modules/mcp-developer/mcp-developer.module';
import { MetricsGraphqlModule } from './graphql/metrics/metrics-graphql.module';
import { MetricsModule } from './metrics/metrics.module';
import { ModelDiscoveryGraphqlModule } from './graphql/model-discovery/model-discovery-graphql.module';
import { NotesGraphqlModule } from './graphql/notes/notes-graphql.module';
import { NotificationsGraphqlModule } from './graphql/notifications/notifications-graphql.module';
import { NOTIFICATION_EVENT_TYPES } from './graphql/notifications/notification-event.object';
import { NotificationsModule } from './notifications/notifications.module';
import { PlanEmbeddingsGraphqlModule } from './graphql/plan-embeddings/plan-embeddings-graphql.module';
import { PlanLifecycleHooksQueueModule } from './queues/plan-lifecycle-hooks/plan-lifecycle-hooks-queue.module';
import { PlanRulesQueueModule } from './queues/plan-rules/plan-rules-queue.module';
import { TaggingQueueModule } from './queues/tagging/tagging-queue.module';
import { PlanOutputStreamGraphqlModule } from './graphql/plan-output-stream/plan-output-stream-graphql.module';
import { PlansGraphqlModule } from './graphql/plans/plans-graphql.module';
import { QueueJobLogsGraphqlModule } from './graphql/queue-job-logs/queue-job-logs-graphql.module';
import { BullMqRunOutputModule } from './queues/bullmq-run-output.module';
import { PlansQueueModule } from './queues/plans/plans-queue.module';
import { ProjectSkillsGraphqlModule } from './graphql/project-skills/project-skills-graphql.module';
import { ProjectsGraphqlModule } from './graphql/projects/projects-graphql.module';
import { QueuesGraphqlModule } from './graphql/queues/queues-graphql.module';
import { ServiceAccountsGraphqlModule } from './graphql/service-accounts/service-accounts-graphql.module';
import { SearchGraphqlModule } from './graphql/search/search-graphql.module';
import { SkillAvailabilityGraphqlModule } from './graphql/skill-availability/skill-availability-graphql.module';
import { SkillTagsGraphqlModule } from './graphql/skill-tags/skill-tags-graphql.module';
import { TagActionRulesGraphqlModule } from './graphql/tag-action-rules/tag-action-rules-graphql.module';
import { TagsGraphqlModule } from './graphql/tags/tags-graphql.module';
import { TaskEmbeddingsGraphqlModule } from './graphql/task-embeddings/task-embeddings-graphql.module';
import { TasksGraphqlModule } from './graphql/tasks/tasks-graphql.module';
import { TranscriptionStreamGraphqlModule } from './graphql/transcription-stream/transcription-stream-graphql.module';
import { UsersGraphqlModule } from './graphql/users/users-graphql.module';
import { WorkLedgerGraphqlModule } from './graphql/work-ledger/work-ledger-graphql.module';
import { WorkspaceSettingsGraphqlModule } from './graphql/workspace-settings/workspace-settings-graphql.module';
import { RolesGraphqlModule } from './graphql/roles/roles-graphql.module';

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
        ]
      : []),
    ...(isApiLike ? [DevelopmentModule] : []),
    ...(isWorkerLike ? [DocIngestionQueueModule] : []),
    ...(isApiLike ? [GeneratorsModule, McpDeveloperModule] : []),
    ...(isWorkerLike
      ? [
          PlanLifecycleHooksQueueModule,
          PlanRulesQueueModule,
          PlansQueueModule,
          TaggingQueueModule,
        ]
      : []),

    // 🧩 GraphQL Modules
    ...(isApiLike
      ? [
          ActivityGraphqlModule,
          AgenticWorkflowGraphqlModule,
          AgentConversationsGraphqlModule,
          AgentDiscoveryGraphqlModule,
          AgentsGraphqlModule,
          AuthGraphqlModule,
          CodeSearchGraphqlModule,
          CommitLinksGraphqlModule,
          ConversationStreamGraphqlModule,
          CustomPromptsGraphqlModule,
          DailyStatsGraphqlModule,
          GeneratorsGraphqlModule,
          GithubGraphqlModule,
          HealthGraphqlModule,
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
          RolesGraphqlModule,
          ServiceAccountsGraphqlModule,
          SearchGraphqlModule,
          SkillAvailabilityGraphqlModule,
          SkillTagsGraphqlModule,
          TagActionRulesGraphqlModule,
          TagsGraphqlModule,
          TaskEmbeddingsGraphqlModule,
          TasksGraphqlModule,
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
