import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { GlobalClsModule } from '@openthrottle/nestjs-modules/src/global-cls/global-cls.module';
import { LoggerModule } from '@openthrottle/nestjs-modules/src/logger/logger.module';
import { Module } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { NestjsAuthModule } from '@openthrottle/nestjs-auth';
import { NestjsBullmqBoardModule } from '@openthrottle/nestjs-bullmq-board';
import { NestjsBullmqModule } from '@openthrottle/nestjs-bullmq';
import { NestjsGraphqlModule } from '@openthrottle/nestjs-graphql/src/nestjs-graphql.module';
import { NestjsProfilingModule } from '@openthrottle/nestjs-profiling';
import { NestjsRbacModule } from '@openthrottle/nestjs-rbac';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import {
  EmitNotificationInterceptor,
  NestjsWebsocketsModule,
} from '@openthrottle/nestjs-websockets';
import { GithubGraphqlModule } from '@openthrottle/nestjs-github';
import { ActivityGraphqlModule } from './graphql/activity/activity-graphql.module';
import { AuthGraphqlModule } from './graphql/auth/auth-graphql.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommitLinksGraphqlModule } from './graphql/commit-links/commit-links-graphql.module';
import { CustomPromptsGraphqlModule } from './graphql/prompts/custom-prompts-graphql.module';
import { DailyStatsGraphqlModule } from './graphql/daily-stats/daily-stats-graphql.module';
import { DailyStatsQueueModule } from './queues/daily-stats/daily-stats-queue.module';
import { DocIngestionQueueModule } from './queues/doc-ingestion/doc-ingestion-queue.module';
import { DevelopmentModule } from './modules/development/development.module';
import { GeneratorsGraphqlModule } from './graphql/generators/generators-graphql.module';
import { GeneratorsModule } from './modules/generators/generators.module';
import { HealthGraphqlModule } from './graphql/health/health-graphql.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsGraphqlModule } from './graphql/metrics/metrics-graphql.module';
import { MetricsModule } from './metrics/metrics.module';
import { NotesGraphqlModule } from './graphql/notes/notes-graphql.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlanEmbeddingsGraphqlModule } from './graphql/plan-embeddings/plan-embeddings-graphql.module';
import { PlanOutputStreamGraphqlModule } from './graphql/plan-output-stream/plan-output-stream-graphql.module';
import { PaymentsGraphqlModule } from './graphql/payments/payments-graphql.module';
import { PlansGraphqlModule } from './graphql/plans/plans-graphql.module';
import { PlansQueueModule } from './queues/plans/plans-queue.module';
import { ProjectsGraphqlModule } from './graphql/projects/projects-graphql.module';
import { QueuesGraphqlModule } from './graphql/queues/queues-graphql.module';
import { RolesGraphqlModule } from './graphql/roles/roles-graphql.module';
import { SearchGraphqlModule } from './graphql/search/search-graphql.module';
import { TaskEmbeddingsGraphqlModule } from './graphql/task-embeddings/task-embeddings-graphql.module';
import { TasksGraphqlModule } from './graphql/tasks/tasks-graphql.module';
import { UsersGraphqlModule } from './graphql/users/users-graphql.module';
import { GlobalClsAuthHook } from './auth/global-cls-auth-hook.service';
import { GlobalJwtAuthGuard } from './guards/global-jwt-auth.guard';
import { GqlJwtAuthGuard } from './guards/gql-jwt-auth.guard';

@Module({
  controllers: [AppController],
  exports: [AppService],
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env'],
      isGlobal: true,
    }),

    GlobalClsModule,
    HealthModule,
    LoggerModule,
    MetricsModule,
    NestjsAuthModule.forRoot(),
    NestjsBullmqModule,
    NestjsBullmqBoardModule,
    NestjsGraphqlModule.forRoot({
      cachePlugins: {
        cacheControl: true,
        responseCache: true,
      },
      context: ({ req }: { req: unknown }) => ({ req }),
    }),
    NestjsProfilingModule,
    NestjsRbacModule,
    NestjsRepositoriesModule,
    NestjsWebsocketsModule,
    NotificationsModule,

    // 🧩 Application Modules
    DailyStatsQueueModule,
    DevelopmentModule,
    GeneratorsModule,
    PaymentsModule,
    DocIngestionQueueModule,
    PlansQueueModule,

    // 🧩 GraphQL Modules
    ActivityGraphqlModule,
    AuthGraphqlModule,
    CommitLinksGraphqlModule,
    CustomPromptsGraphqlModule,
    DailyStatsGraphqlModule,
    GeneratorsGraphqlModule,
    GithubGraphqlModule,
    HealthGraphqlModule,
    MetricsGraphqlModule,
    NotesGraphqlModule,
    PlanEmbeddingsGraphqlModule,
    PlanOutputStreamGraphqlModule,
    PaymentsGraphqlModule,
    PlansGraphqlModule,
    ProjectsGraphqlModule,
    QueuesGraphqlModule,
    RolesGraphqlModule,
    SearchGraphqlModule,
    TaskEmbeddingsGraphqlModule,
    TasksGraphqlModule,
    UsersGraphqlModule,
  ],
  providers: [
    AppService,
    GlobalClsAuthHook,
    GqlJwtAuthGuard,
    GlobalJwtAuthGuard,
    { provide: APP_GUARD, useClass: GlobalJwtAuthGuard },
    /* eslint-disable @typescript-eslint/consistent-type-assertions -- Nest `Provider` typings omit `multi` for `APP_INTERCEPTOR` */
    {
      multi: true,
      provide: APP_INTERCEPTOR,
      useClass: EmitNotificationInterceptor,
    } as Provider,
    /* eslint-enable @typescript-eslint/consistent-type-assertions */
  ],
})
export class AppModule {}
