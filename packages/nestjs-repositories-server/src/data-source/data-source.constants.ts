import { AgentAccount } from '../modules/agent-accounts/agent-account.entity.ts';
import { AgentConversationMessage } from '../modules/agent-conversation-messages/agent-conversation-message.entity.ts';
import { AgentConversation } from '../modules/agent-conversations/agent-conversation.entity.ts';
import { AgentTokenUsage } from '../modules/agent-token-usage/agent-token-usage.entity.ts';
import { AgentTrajectory } from '../modules/agent-trajectories/agent-trajectory.entity.ts';
import { BlogAuthor } from '../modules/blog-authors/blog-author.entity.ts';
import { BlogPost } from '../modules/blog-posts/blog-post.entity.ts';
import { BlogTag } from '../modules/blog-tags/blog-tag.entity.ts';
import { CodeEmbedding } from '../modules/code-embeddings/code-embedding.entity.ts';
import { CodeIndexSnapshot } from '../modules/code-index-snapshots/code-index-snapshot.entity.ts';
import { CustomPrompt } from '../modules/custom-prompts/custom-prompt.entity.ts';
import { DailyStat } from '../modules/daily-stats/daily-stat.entity.ts';
import { EvalCase } from '../modules/eval-cases/eval-case.entity.ts';
import { EvalDataset } from '../modules/eval-datasets/eval-dataset.entity.ts';
import { EvalGrade } from '../modules/eval-grades/eval-grade.entity.ts';
import { EvalHumanLabel } from '../modules/eval-human-labels/eval-human-label.entity.ts';
import { EvalJudgeCalibration } from '../modules/eval-judge-calibrations/eval-judge-calibration.entity.ts';
import { EvalRun } from '../modules/eval-runs/eval-run.entity.ts';
import { EvalTrial } from '../modules/eval-trials/eval-trial.entity.ts';
import { McpConnectorConnection } from '../modules/mcp-connector-connections/mcp-connector-connection.entity.ts';
import { Note } from '../modules/notes/note.entity.ts';
import { OAuthAuthorizationRequest } from '../modules/oauth/oauth-authorization-request.entity.ts';
import { OAuthClient } from '../modules/oauth/oauth-client.entity.ts';
import { OAuthGrant } from '../modules/oauth/oauth-grant.entity.ts';
import { OAuthToken } from '../modules/oauth/oauth-token.entity.ts';
import { Permission } from '../modules/permissions/permission.entity.ts';
import { PlanEmbedding } from '../modules/plan-embeddings/plan-embedding.entity.ts';
import { PlanMessage } from '../modules/plan-messages/plan-message.entity.ts';
import { PlanOutputStreamChunk } from '../modules/plan-output-stream/plan-output-stream-chunk.entity.ts';
import { PlanRun } from '../modules/plan-runs/plan-run.entity.ts';
import { PlanTag } from '../modules/plan-tags/plan-tag.entity.ts';
import { Plan } from '../modules/plans/plan.entity.ts';
import { ProjectRepository } from '../modules/project-repositories/project-repository.entity.ts';
import { ProjectSkill } from '../modules/project-skills/project-skill.entity.ts';
import { ProjectTag } from '../modules/project-tags/project-tag.entity.ts';
import { Project } from '../modules/projects/project.entity.ts';
import { Repository } from '../modules/repositories/repository.entity.ts';
import { RepositoryCheckout } from '../modules/repository-checkouts/repository-checkout.entity.ts';
import { Role } from '../modules/roles/role.entity.ts';
import { RuleApplication } from '../modules/rule-applications/rule-application.entity.ts';
import { ScheduledAgentJobRun } from '../modules/scheduled-agent-job-runs/scheduled-agent-job-run.entity.ts';
import { ScheduledAgentJobWebhookDelivery } from '../modules/scheduled-agent-job-webhook-deliveries/scheduled-agent-job-webhook-delivery.entity.ts';
import { ScheduledAgentJobWebhookTrigger } from '../modules/scheduled-agent-job-webhook-triggers/scheduled-agent-job-webhook-trigger.entity.ts';
import { ScheduledAgentJob } from '../modules/scheduled-agent-jobs/scheduled-agent-job.entity.ts';
import { ServiceAccountCredential } from '../modules/service-account-credentials/service-account-credential.entity.ts';
import { ServiceAccount } from '../modules/service-accounts/service-account.entity.ts';
import { SkillAvailabilityRuleSet } from '../modules/skill-availability-rule-sets/skill-availability-rule-set.entity.ts';
import { SkillAvailabilityRule } from '../modules/skill-availability-rules/skill-availability-rule.entity.ts';
import { UserSkillTag } from '../modules/skill-tags/user-skill-tag.entity.ts';
import { SkillUsageEvent } from '../modules/skill-usage-events/skill-usage-event.entity.ts';
import { SkillUsageOutcome } from '../modules/skill-usage-outcomes/skill-usage-outcome.entity.ts';
import { Subscription } from '../modules/subscriptions/subscription.entity.ts';
import { TagActionRule } from '../modules/tag-action-rules/tag-action-rule.entity.ts';
import { TaskEmbedding } from '../modules/task-embeddings/task-embedding.entity.ts';
import { TaskTag } from '../modules/task-tags/task-tag.entity.ts';
import { Task } from '../modules/tasks/task.entity.ts';
import { TelemetryHeartbeat } from '../modules/telemetry-heartbeats/telemetry-heartbeat.entity.ts';
import { UserDisabledAgentCli } from '../modules/user-disabled-agent-clis/user-disabled-agent-cli.entity.ts';
import { UserFavoriteAgentModel } from '../modules/user-favorite-agent-models/user-favorite-agent-model.entity.ts';
import { UserFavoriteProject } from '../modules/user-favorite-projects/user-favorite-project.entity.ts';
import { UserPreferences } from '../modules/user-preferences/user-preferences.entity.ts';
import { UserWorkspaceSettings } from '../modules/user-workspace-settings/user-workspace-settings.entity.ts';
import { User } from '../modules/users/user.entity.ts';
import { WorkArtifact } from '../modules/work-artifacts/work-artifact.entity.ts';
import { WorkSessionSubject } from '../modules/work-session-subjects/work-session-subject.entity.ts';
import { WorkSession } from '../modules/work-sessions/work-session.entity.ts';
import { WorktreeRemoval } from '../modules/worktree-removals/worktree-removal.entity.ts';

/**
 * @description Every entity of the openthrottle database, listed explicitly for the app's
 * default DataSource (`getOpenThrottleTypeOrmOptions`). A new table's entity goes here in
 * the same change as its module: one missing from this list fails at query time, not at boot,
 * and the live drift test (which boots on exactly this list) is what catches it.
 * @public
 */
export const OPENTHROTTLE_ENTITIES = [
  AgentAccount,
  AgentConversation,
  AgentConversationMessage,
  AgentTokenUsage,
  AgentTrajectory,
  BlogAuthor,
  BlogPost,
  BlogTag,
  CodeEmbedding,
  CodeIndexSnapshot,
  CustomPrompt,
  DailyStat,
  EvalCase,
  EvalDataset,
  EvalGrade,
  EvalHumanLabel,
  EvalJudgeCalibration,
  EvalRun,
  EvalTrial,
  McpConnectorConnection,
  Note,
  OAuthAuthorizationRequest,
  OAuthClient,
  OAuthGrant,
  OAuthToken,
  Permission,
  Plan,
  PlanEmbedding,
  PlanMessage,
  PlanOutputStreamChunk,
  PlanRun,
  PlanTag,
  Project,
  ProjectRepository,
  ProjectSkill,
  ProjectTag,
  Repository,
  RepositoryCheckout,
  Role,
  RuleApplication,
  ScheduledAgentJob,
  ScheduledAgentJobRun,
  ScheduledAgentJobWebhookDelivery,
  ScheduledAgentJobWebhookTrigger,
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
  TelemetryHeartbeat,
  User,
  UserDisabledAgentCli,
  UserFavoriteAgentModel,
  UserFavoriteProject,
  UserPreferences,
  UserSkillTag,
  UserWorkspaceSettings,
  WorkArtifact,
  WorkSession,
  WorkSessionSubject,
  WorktreeRemoval,
] as const;
