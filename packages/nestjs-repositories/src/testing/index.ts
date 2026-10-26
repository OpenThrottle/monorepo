/**
 * @description Test-data factories, published as `@openthrottle/nestjs-repositories/testing`.
 *
 * Kept off the main entry on purpose: every factory imports `@faker-js/faker`, a devDependency.
 * Re-exported from `.` they made the production server load faker at startup, and the image —
 * which installs production dependencies only — crashed with ERR_MODULE_NOT_FOUND.
 */
export type {
  AgentConversationFactoryData,
  AgentConversationMessageFactoryData,
} from '../modules/agent-conversations/agent-conversations.factory.ts';
export {
  agentConversationMessagesFactory,
  agentConversationsFactory,
} from '../modules/agent-conversations/agent-conversations.factory.ts';
export type { AgentTokenUsageFactoryData } from '../modules/agent-token-usage/agent-token-usage.factory.ts';
export { agentTokenUsageFactory } from '../modules/agent-token-usage/agent-token-usage.factory.ts';
export { blogAuthorsFactory } from '../modules/blog-authors/blog-authors.factory.ts';
export { blogPostsFactory } from '../modules/blog-posts/blog-posts.factory.ts';
export { blogTagsFactory } from '../modules/blog-tags/blog-tags.factory.ts';
export { codeEmbeddingsFactory } from '../modules/code-embeddings/code-embeddings.factory.ts';
export { codeIndexSnapshotsFactory } from '../modules/code-index-snapshots/code-index-snapshots.factory.ts';
export type { DailyStatFactoryData } from '../modules/daily-stats/daily-stats.factory.ts';
export { dailyStatsFactory } from '../modules/daily-stats/daily-stats.factory.ts';
export type { NoteFactoryData } from '../modules/notes/notes.factory.ts';
export { notesFactory } from '../modules/notes/notes.factory.ts';
export { planEmbeddingsFactory } from '../modules/plan-embeddings/plan-embeddings.factory.ts';
export { planOutputStreamFactory } from '../modules/plan-output-stream/plan-output-stream.factory.ts';
export { plansFactory } from '../modules/plans/plans.factory.ts';
export { projectsFactory } from '../modules/projects/projects.factory.ts';
export type { CustomPromptFactoryData } from '../modules/prompts/custom-prompts.factory.ts';
export { customPromptsFactory } from '../modules/prompts/custom-prompts.factory.ts';
export type { SkillUsageEventFactoryData } from '../modules/skill-usage-events/skill-usage-events.factory.ts';
export { skillUsageEventsFactory } from '../modules/skill-usage-events/skill-usage-events.factory.ts';
export type { SkillUsageOutcomeFactoryData } from '../modules/skill-usage-events/skill-usage-outcomes.factory.ts';
export { skillUsageOutcomesFactory } from '../modules/skill-usage-events/skill-usage-outcomes.factory.ts';
export { taskEmbeddingsFactory } from '../modules/task-embeddings/task-embeddings.factory.ts';
export { tasksFactory } from '../modules/tasks/tasks.factory.ts';
export { usersFactory } from '../modules/users/users.factory.ts';
export {
  workArtifactsFactory,
  workSessionsFactory,
  workSessionSubjectsFactory,
} from '../modules/work-ledger/work-ledger.factory.ts';
