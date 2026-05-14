import { LoggerModule } from '@openthrottle/nestjs-modules';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommitLinksModule } from './modules/commit-links/commit-links.module';
import { CustomPromptsModule } from './modules/prompts/custom-prompts.module';
import { DailyStatsModule } from './modules/daily-stats/daily-stats.module';
import { getTypeOrmOptions } from './database.config';
import { NotesModule } from './modules/notes/notes.module';
import { PlanEmbeddingsModule } from './modules/plan-embeddings/plan-embeddings.module';
import { PlanOutputStreamModule } from './modules/plan-output-stream/plan-output-stream.module';
import { PlanRunsModule } from './modules/plan-runs/plan-runs.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { RolesModule } from './modules/roles/roles.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TaskEmbeddingsModule } from './modules/task-embeddings/task-embeddings.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  controllers: [],
  exports: [
    CommitLinksModule,
    CustomPromptsModule,
    DailyStatsModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectsModule,
    RolesModule,
    SubscriptionsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
  ],
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): ReturnType<typeof getTypeOrmOptions> =>
        getTypeOrmOptions(),
    }),
    CommitLinksModule,
    CustomPromptsModule,
    DailyStatsModule,
    LoggerModule,
    NotesModule,
    PlanEmbeddingsModule,
    PlanOutputStreamModule,
    PlanRunsModule,
    PlansModule,
    ProjectsModule,
    RolesModule,
    SubscriptionsModule,
    TaskEmbeddingsModule,
    TasksModule,
    UsersModule,
  ],
  providers: [],
})
export class NestjsRepositoriesModule {}
