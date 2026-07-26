/**
 * @description Nest MCP tool and resource registrations mirroring the stdio server — delegates to shared GraphQL-only handlers in `nest-tool-handlers`.
 */

import { Injectable } from '@nestjs/common';
import { ResourceTemplate, Tool } from '@rekog/mcp-nest';
import * as Th from '../nest-tool-handlers.ts';
import { z } from 'zod';

/**
 * @description Bridges the codegen tool-parameter schemas to `@rekog/mcp-nest`'s
 * `@Tool({ parameters })` typing. This is not papering over a bug: the generated
 * `*ToolParameters` schemas import from `zod/v3` (see `src/__generated__/schemas.ts`),
 * while `@rekog/mcp-nest` types `parameters` as the `z.ZodType` from zod v4 (`zod@4`).
 * The v3 and v4 `ZodType` are distinct nominal types and not mutually assignable, so
 * no structural typing can connect them. Rather than an `as` assertion, we narrow via
 * a runtime type predicate that checks for the one member `@rekog/mcp-nest` actually
 * calls — `safeParse` — which both v3 and v4 schemas provide. Input takes `unknown` so
 * callers cannot accidentally satisfy it with a non-schema value.
 */

const isZodSchema = (schema: unknown): schema is z.ZodType =>
  typeof schema === 'object' &&
  schema !== null &&
  'safeParse' in schema &&
  typeof schema.safeParse === 'function';

const asMcpParameters = (schema: unknown): z.ZodType => {
  if (!isZodSchema(schema)) {
    throw new TypeError('MCP tool parameters must be a Zod schema');
  }
  return schema;
};

/**
 * @description Injectable MCP surface: one `@Tool` per Cursor-exposed tool name and the knowledge-base chunk `@ResourceTemplate`.
 */
@Injectable()
export class McpDeveloperMcpSurface {
  @Tool({
    description: Th.appendPlanOutputToolDescription,
    name: 'append_plan_output',
    parameters: asMcpParameters(Th.appendPlanOutputToolParameters),
  })
  appendPlanOutput(
    args: Parameters<typeof Th.appendPlanOutputToolHandler>[0],
  ): ReturnType<typeof Th.appendPlanOutputToolHandler> {
    return Th.appendPlanOutputToolHandler(args);
  }

  @Tool({
    description: Th.getAgentConversationToolDescription,
    name: 'agent_conversation_get',
    parameters: asMcpParameters(Th.getAgentConversationToolParameters),
  })
  agentConversationGet(
    args: Parameters<typeof Th.getAgentConversationToolHandler>[0],
  ): ReturnType<typeof Th.getAgentConversationToolHandler> {
    return Th.getAgentConversationToolHandler(args);
  }

  @Tool({
    description: Th.getAgentConversationMessagesToolDescription,
    name: 'agent_conversation_get_messages',
    parameters: asMcpParameters(Th.getAgentConversationMessagesToolParameters),
  })
  agentConversationGetMessages(
    args: Parameters<typeof Th.getAgentConversationMessagesToolHandler>[0],
  ): ReturnType<typeof Th.getAgentConversationMessagesToolHandler> {
    return Th.getAgentConversationMessagesToolHandler(args);
  }

  @Tool({
    description: Th.listAgentConversationsToolDescription,
    name: 'agent_conversation_list',
    parameters: asMcpParameters(Th.listAgentConversationsToolParameters),
  })
  agentConversationList(
    args: Parameters<typeof Th.listAgentConversationsToolHandler>[0],
  ): ReturnType<typeof Th.listAgentConversationsToolHandler> {
    return Th.listAgentConversationsToolHandler(args);
  }

  @Tool({
    description: Th.createNoteToolDescription,
    name: 'create_note',
    parameters: asMcpParameters(Th.createNoteToolParameters),
  })
  createNote(
    args: Parameters<typeof Th.createNoteToolHandler>[0],
  ): ReturnType<typeof Th.createNoteToolHandler> {
    return Th.createNoteToolHandler(args);
  }

  @Tool({
    description: Th.createPlanToolDescription,
    name: 'create_plan',
    parameters: asMcpParameters(Th.createPlanToolParameters),
  })
  createPlan(
    args: Parameters<typeof Th.createPlanToolHandler>[0],
  ): ReturnType<typeof Th.createPlanToolHandler> {
    return Th.createPlanToolHandler(args);
  }

  @Tool({
    description: Th.createPlansToolDescription,
    name: 'create_plans',
    parameters: asMcpParameters(Th.createPlansToolParameters),
  })
  createPlans(
    args: Parameters<typeof Th.createPlansToolHandler>[0],
  ): ReturnType<typeof Th.createPlansToolHandler> {
    return Th.createPlansToolHandler(args);
  }

  @Tool({
    description: Th.createTaskToolDescription,
    name: 'create_task',
    parameters: asMcpParameters(Th.createTaskToolParameters),
  })
  createTask(
    args: Parameters<typeof Th.createTaskToolHandler>[0],
  ): ReturnType<typeof Th.createTaskToolHandler> {
    return Th.createTaskToolHandler(args);
  }

  @Tool({
    description: Th.createTasksToolDescription,
    name: 'create_tasks',
    parameters: asMcpParameters(Th.createTasksToolParameters),
  })
  createTasks(
    args: Parameters<typeof Th.createTasksToolHandler>[0],
  ): ReturnType<typeof Th.createTasksToolHandler> {
    return Th.createTasksToolHandler(args);
  }

  @Tool({
    description: Th.deleteNoteToolDescription,
    name: 'delete_note',
    parameters: asMcpParameters(Th.deleteNoteToolParameters),
  })
  deleteNote(
    args: Parameters<typeof Th.deleteNoteToolHandler>[0],
  ): ReturnType<typeof Th.deleteNoteToolHandler> {
    return Th.deleteNoteToolHandler(args);
  }

  @Tool({
    description: Th.deletePlanToolDescription,
    name: 'delete_plan',
    parameters: asMcpParameters(Th.deletePlanToolParameters),
  })
  deletePlan(
    args: Parameters<typeof Th.deletePlanToolHandler>[0],
  ): ReturnType<typeof Th.deletePlanToolHandler> {
    return Th.deletePlanToolHandler(args);
  }

  @Tool({
    description: Th.deleteProjectToolDescription,
    name: 'delete_project',
    parameters: asMcpParameters(Th.deleteProjectToolParameters),
  })
  deleteProject(
    args: Parameters<typeof Th.deleteProjectToolHandler>[0],
  ): ReturnType<typeof Th.deleteProjectToolHandler> {
    return Th.deleteProjectToolHandler(args);
  }

  @Tool({
    description: Th.deleteTaskToolDescription,
    name: 'delete_task',
    parameters: asMcpParameters(Th.deleteTaskToolParameters),
  })
  deleteTask(
    args: Parameters<typeof Th.deleteTaskToolHandler>[0],
  ): ReturnType<typeof Th.deleteTaskToolHandler> {
    return Th.deleteTaskToolHandler(args);
  }

  @Tool({
    description: Th.getActivityByDateToolDescription,
    name: 'get_activity_by_date',
    parameters: asMcpParameters(Th.getActivityByDateToolParameters),
  })
  getActivityByDate(
    args: Parameters<typeof Th.getActivityByDateToolHandler>[0],
  ): ReturnType<typeof Th.getActivityByDateToolHandler> {
    return Th.getActivityByDateToolHandler(args);
  }

  @Tool({
    description: Th.getDocumentToolDescription,
    name: 'get_document',
    parameters: asMcpParameters(Th.getDocumentToolParameters),
  })
  getDocument(
    args: Parameters<typeof Th.getDocumentToolHandler>[0],
  ): ReturnType<typeof Th.getDocumentToolHandler> {
    return Th.getDocumentToolHandler(args);
  }

  @Tool({
    description: Th.getLastActivityToolDescription,
    name: 'get_last_activity',
    parameters: asMcpParameters(Th.getLastActivityToolParameters),
  })
  getLastActivity(
    args: Parameters<typeof Th.getLastActivityToolHandler>[0],
  ): ReturnType<typeof Th.getLastActivityToolHandler> {
    return Th.getLastActivityToolHandler(args);
  }

  @Tool({
    description: Th.getNoteToolDescription,
    name: 'get_note',
    parameters: asMcpParameters(Th.getNoteToolParameters),
  })
  getNote(
    args: Parameters<typeof Th.getNoteToolHandler>[0],
  ): ReturnType<typeof Th.getNoteToolHandler> {
    return Th.getNoteToolHandler(args);
  }

  @Tool({
    description: Th.getPlanOutputToolDescription,
    name: 'get_plan_output',
    parameters: asMcpParameters(Th.getPlanOutputToolParameters),
  })
  getPlanOutput(
    args: Parameters<typeof Th.getPlanOutputToolHandler>[0],
  ): ReturnType<typeof Th.getPlanOutputToolHandler> {
    return Th.getPlanOutputToolHandler(args);
  }

  @Tool({
    description: Th.deletePlanOutputToolDescription,
    name: 'delete_plan_output',
    parameters: asMcpParameters(Th.deletePlanOutputToolParameters),
  })
  deletePlanOutput(
    args: Parameters<typeof Th.deletePlanOutputToolHandler>[0],
  ): ReturnType<typeof Th.deletePlanOutputToolHandler> {
    return Th.deletePlanOutputToolHandler(args);
  }

  @Tool({
    description: Th.getPlanToolDescription,
    name: 'get_plan',
    parameters: asMcpParameters(Th.getPlanToolParameters),
  })
  getPlan(
    args: Parameters<typeof Th.getPlanToolHandler>[0],
  ): ReturnType<typeof Th.getPlanToolHandler> {
    return Th.getPlanToolHandler(args);
  }

  @Tool({
    description: Th.getRemainingTasksForPlanToolDescription,
    name: 'get_remaining_tasks_for_plan',
    parameters: asMcpParameters(Th.getRemainingTasksForPlanToolParameters),
  })
  getRemainingTasksForPlan(
    args: Parameters<typeof Th.getRemainingTasksForPlanToolHandler>[0],
  ): ReturnType<typeof Th.getRemainingTasksForPlanToolHandler> {
    return Th.getRemainingTasksForPlanToolHandler(args);
  }

  @Tool({
    description: Th.getTaskToolDescription,
    name: 'get_task',
    parameters: asMcpParameters(Th.getTaskToolParameters),
  })
  getTask(
    args: Parameters<typeof Th.getTaskToolHandler>[0],
  ): ReturnType<typeof Th.getTaskToolHandler> {
    return Th.getTaskToolHandler(args);
  }

  @Tool({
    description: Th.getTasksByPlanIdToolDescription,
    name: 'get_tasks_by_plan_id',
    parameters: asMcpParameters(Th.getTasksByPlanIdToolParameters),
  })
  getTasksByPlanId(
    args: Parameters<typeof Th.getTasksByPlanIdToolHandler>[0],
  ): ReturnType<typeof Th.getTasksByPlanIdToolHandler> {
    return Th.getTasksByPlanIdToolHandler(args);
  }

  @Tool({
    description: Th.healthToolDescription,
    name: 'health',
    parameters: asMcpParameters(Th.healthToolParameters),
  })
  health(
    args: Parameters<typeof Th.healthToolHandler>[0],
  ): ReturnType<typeof Th.healthToolHandler> {
    return Th.healthToolHandler(args);
  }

  @Tool({
    description: Th.discoverLocalModelsToolDescription,
    name: 'discover_local_models',
    parameters: asMcpParameters(Th.discoverLocalModelsToolParameters),
  })
  discoverLocalModels(
    args: Parameters<typeof Th.discoverLocalModelsToolHandler>[0],
  ): ReturnType<typeof Th.discoverLocalModelsToolHandler> {
    return Th.discoverLocalModelsToolHandler(args);
  }

  @Tool({
    description: Th.attachSessionSubjectToolDescription,
    name: 'attach_session_subject',
    parameters: asMcpParameters(Th.attachSessionSubjectToolParameters),
  })
  attachSessionSubject(
    args: Parameters<typeof Th.attachSessionSubjectToolHandler>[0],
  ): ReturnType<typeof Th.attachSessionSubjectToolHandler> {
    return Th.attachSessionSubjectToolHandler(args);
  }

  @Tool({
    description: Th.endSessionToolDescription,
    name: 'end_session',
    parameters: asMcpParameters(Th.endSessionToolParameters),
  })
  endSession(
    args: Parameters<typeof Th.endSessionToolHandler>[0],
  ): ReturnType<typeof Th.endSessionToolHandler> {
    return Th.endSessionToolHandler(args);
  }

  @Tool({
    description: Th.recordArtifactToolDescription,
    name: 'record_artifact',
    parameters: asMcpParameters(Th.recordArtifactToolParameters),
  })
  recordArtifact(
    args: Parameters<typeof Th.recordArtifactToolHandler>[0],
  ): ReturnType<typeof Th.recordArtifactToolHandler> {
    return Th.recordArtifactToolHandler(args);
  }

  @Tool({
    description: Th.listNotesToolDescription,
    name: 'list_notes',
    parameters: asMcpParameters(Th.listNotesToolParameters),
  })
  listNotes(
    args: Parameters<typeof Th.listNotesToolHandler>[0],
  ): ReturnType<typeof Th.listNotesToolHandler> {
    return Th.listNotesToolHandler(args);
  }

  @Tool({
    description: Th.listPlansByStatusToolDescription,
    name: 'list_plans_by_status',
    parameters: asMcpParameters(Th.listPlansByStatusToolParameters),
  })
  listPlansByStatus(
    args: Parameters<typeof Th.listPlansByStatusToolHandler>[0],
  ): ReturnType<typeof Th.listPlansByStatusToolHandler> {
    return Th.listPlansByStatusToolHandler(args);
  }

  @Tool({
    description: Th.listSourcesToolDescription,
    name: 'list_sources',
    parameters: asMcpParameters(Th.listSourcesToolParameters),
  })
  listSources(
    args: Parameters<typeof Th.listSourcesToolHandler>[0],
  ): ReturnType<typeof Th.listSourcesToolHandler> {
    return Th.listSourcesToolHandler(args);
  }

  @Tool({
    description: Th.listTasksByCategoryToolDescription,
    name: 'list_tasks_by_category',
    parameters: asMcpParameters(Th.listTasksByCategoryToolParameters),
  })
  listTasksByCategory(
    args: Parameters<typeof Th.listTasksByCategoryToolHandler>[0],
  ): ReturnType<typeof Th.listTasksByCategoryToolHandler> {
    return Th.listTasksByCategoryToolHandler(args);
  }

  @Tool({
    description: Th.reorderPlanTasksToolDescription,
    name: 'reorder_plan_tasks',
    parameters: asMcpParameters(Th.reorderPlanTasksToolParameters),
  })
  reorderPlanTasks(
    args: Parameters<typeof Th.reorderPlanTasksToolHandler>[0],
  ): ReturnType<typeof Th.reorderPlanTasksToolHandler> {
    return Th.reorderPlanTasksToolHandler(args);
  }

  @Tool({
    description: Th.listSkillTagsToolDescription,
    name: 'list_skill_tags',
    parameters: asMcpParameters(Th.listSkillTagsToolParameters),
  })
  listSkillTags(
    args: Parameters<typeof Th.listSkillTagsToolHandler>[0],
  ): ReturnType<typeof Th.listSkillTagsToolHandler> {
    return Th.listSkillTagsToolHandler(args);
  }

  @Tool({
    description: Th.addSkillTagToolDescription,
    name: 'add_skill_tag',
    parameters: asMcpParameters(Th.addSkillTagToolParameters),
  })
  addSkillTag(
    args: Parameters<typeof Th.addSkillTagToolHandler>[0],
  ): ReturnType<typeof Th.addSkillTagToolHandler> {
    return Th.addSkillTagToolHandler(args);
  }

  @Tool({
    description: Th.renameSkillTagToolDescription,
    name: 'rename_skill_tag',
    parameters: asMcpParameters(Th.renameSkillTagToolParameters),
  })
  renameSkillTag(
    args: Parameters<typeof Th.renameSkillTagToolHandler>[0],
  ): ReturnType<typeof Th.renameSkillTagToolHandler> {
    return Th.renameSkillTagToolHandler(args);
  }

  @Tool({
    description: Th.removeSkillTagToolDescription,
    name: 'remove_skill_tag',
    parameters: asMcpParameters(Th.removeSkillTagToolParameters),
  })
  removeSkillTag(
    args: Parameters<typeof Th.removeSkillTagToolHandler>[0],
  ): ReturnType<typeof Th.removeSkillTagToolHandler> {
    return Th.removeSkillTagToolHandler(args);
  }

  @Tool({
    description: Th.addPlanTagToolDescription,
    name: 'add_plan_tag',
    parameters: asMcpParameters(Th.addPlanTagToolParameters),
  })
  addPlanTag(
    args: Parameters<typeof Th.addPlanTagToolHandler>[0],
  ): ReturnType<typeof Th.addPlanTagToolHandler> {
    return Th.addPlanTagToolHandler(args);
  }

  @Tool({
    description: Th.removePlanTagToolDescription,
    name: 'remove_plan_tag',
    parameters: asMcpParameters(Th.removePlanTagToolParameters),
  })
  removePlanTag(
    args: Parameters<typeof Th.removePlanTagToolHandler>[0],
  ): ReturnType<typeof Th.removePlanTagToolHandler> {
    return Th.removePlanTagToolHandler(args);
  }

  @Tool({
    description: Th.addProjectTagToolDescription,
    name: 'add_project_tag',
    parameters: asMcpParameters(Th.addProjectTagToolParameters),
  })
  addProjectTag(
    args: Parameters<typeof Th.addProjectTagToolHandler>[0],
  ): ReturnType<typeof Th.addProjectTagToolHandler> {
    return Th.addProjectTagToolHandler(args);
  }

  @Tool({
    description: Th.removeProjectTagToolDescription,
    name: 'remove_project_tag',
    parameters: asMcpParameters(Th.removeProjectTagToolParameters),
  })
  removeProjectTag(
    args: Parameters<typeof Th.removeProjectTagToolHandler>[0],
  ): ReturnType<typeof Th.removeProjectTagToolHandler> {
    return Th.removeProjectTagToolHandler(args);
  }

  @Tool({
    description: Th.addTaskTagToolDescription,
    name: 'add_task_tag',
    parameters: asMcpParameters(Th.addTaskTagToolParameters),
  })
  addTaskTag(
    args: Parameters<typeof Th.addTaskTagToolHandler>[0],
  ): ReturnType<typeof Th.addTaskTagToolHandler> {
    return Th.addTaskTagToolHandler(args);
  }

  @Tool({
    description: Th.removeTaskTagToolDescription,
    name: 'remove_task_tag',
    parameters: asMcpParameters(Th.removeTaskTagToolParameters),
  })
  removeTaskTag(
    args: Parameters<typeof Th.removeTaskTagToolHandler>[0],
  ): ReturnType<typeof Th.removeTaskTagToolHandler> {
    return Th.removeTaskTagToolHandler(args);
  }

  @Tool({
    description: Th.listTagActionRulesToolDescription,
    name: 'list_tag_action_rules',
    parameters: asMcpParameters(Th.listTagActionRulesToolParameters),
  })
  listTagActionRules(
    args: Parameters<typeof Th.listTagActionRulesToolHandler>[0],
  ): ReturnType<typeof Th.listTagActionRulesToolHandler> {
    return Th.listTagActionRulesToolHandler(args);
  }

  @Tool({
    description: Th.listRuleApplicationsToolDescription,
    name: 'list_rule_applications',
    parameters: asMcpParameters(Th.listRuleApplicationsToolParameters),
  })
  listRuleApplications(
    args: Parameters<typeof Th.listRuleApplicationsToolHandler>[0],
  ): ReturnType<typeof Th.listRuleApplicationsToolHandler> {
    return Th.listRuleApplicationsToolHandler(args);
  }

  @Tool({
    description: Th.upsertTagActionRuleToolDescription,
    name: 'upsert_tag_action_rule',
    parameters: asMcpParameters(Th.upsertTagActionRuleToolParameters),
  })
  upsertTagActionRule(
    args: Parameters<typeof Th.upsertTagActionRuleToolHandler>[0],
  ): ReturnType<typeof Th.upsertTagActionRuleToolHandler> {
    return Th.upsertTagActionRuleToolHandler(args);
  }

  @Tool({
    description: Th.deleteTagActionRuleToolDescription,
    name: 'delete_tag_action_rule',
    parameters: asMcpParameters(Th.deleteTagActionRuleToolParameters),
  })
  deleteTagActionRule(
    args: Parameters<typeof Th.deleteTagActionRuleToolHandler>[0],
  ): ReturnType<typeof Th.deleteTagActionRuleToolHandler> {
    return Th.deleteTagActionRuleToolHandler(args);
  }

  @Tool({
    description: Th.getSkillAvailabilityToolDescription,
    name: 'get_skill_availability',
    parameters: asMcpParameters(Th.getSkillAvailabilityToolParameters),
  })
  getSkillAvailability(
    args: Parameters<typeof Th.getSkillAvailabilityToolHandler>[0],
  ): ReturnType<typeof Th.getSkillAvailabilityToolHandler> {
    return Th.getSkillAvailabilityToolHandler(args);
  }

  @Tool({
    description: Th.getSkillAvailabilityRuleSetToolDescription,
    name: 'get_skill_availability_rule_set',
    parameters: asMcpParameters(Th.getSkillAvailabilityRuleSetToolParameters),
  })
  getSkillAvailabilityRuleSet(
    args: Parameters<typeof Th.getSkillAvailabilityRuleSetToolHandler>[0],
  ): ReturnType<typeof Th.getSkillAvailabilityRuleSetToolHandler> {
    return Th.getSkillAvailabilityRuleSetToolHandler(args);
  }

  @Tool({
    description: Th.upsertSkillAvailabilityRuleSetToolDescription,
    name: 'upsert_skill_availability_rule_set',
    parameters: asMcpParameters(
      Th.upsertSkillAvailabilityRuleSetToolParameters,
    ),
  })
  upsertSkillAvailabilityRuleSet(
    args: Parameters<typeof Th.upsertSkillAvailabilityRuleSetToolHandler>[0],
  ): ReturnType<typeof Th.upsertSkillAvailabilityRuleSetToolHandler> {
    return Th.upsertSkillAvailabilityRuleSetToolHandler(args);
  }

  @Tool({
    description: Th.deleteSkillAvailabilityRuleSetToolDescription,
    name: 'delete_skill_availability_rule_set',
    parameters: asMcpParameters(
      Th.deleteSkillAvailabilityRuleSetToolParameters,
    ),
  })
  deleteSkillAvailabilityRuleSet(
    args: Parameters<typeof Th.deleteSkillAvailabilityRuleSetToolHandler>[0],
  ): ReturnType<typeof Th.deleteSkillAvailabilityRuleSetToolHandler> {
    return Th.deleteSkillAvailabilityRuleSetToolHandler(args);
  }

  @Tool({
    description: Th.addSkillAvailabilityRuleToolDescription,
    name: 'add_skill_availability_rule',
    parameters: asMcpParameters(Th.addSkillAvailabilityRuleToolParameters),
  })
  addSkillAvailabilityRule(
    args: Parameters<typeof Th.addSkillAvailabilityRuleToolHandler>[0],
  ): ReturnType<typeof Th.addSkillAvailabilityRuleToolHandler> {
    return Th.addSkillAvailabilityRuleToolHandler(args);
  }

  @Tool({
    description: Th.updateSkillAvailabilityRuleToolDescription,
    name: 'update_skill_availability_rule',
    parameters: asMcpParameters(Th.updateSkillAvailabilityRuleToolParameters),
  })
  updateSkillAvailabilityRule(
    args: Parameters<typeof Th.updateSkillAvailabilityRuleToolHandler>[0],
  ): ReturnType<typeof Th.updateSkillAvailabilityRuleToolHandler> {
    return Th.updateSkillAvailabilityRuleToolHandler(args);
  }

  @Tool({
    description: Th.removeSkillAvailabilityRuleToolDescription,
    name: 'remove_skill_availability_rule',
    parameters: asMcpParameters(Th.removeSkillAvailabilityRuleToolParameters),
  })
  removeSkillAvailabilityRule(
    args: Parameters<typeof Th.removeSkillAvailabilityRuleToolHandler>[0],
  ): ReturnType<typeof Th.removeSkillAvailabilityRuleToolHandler> {
    return Th.removeSkillAvailabilityRuleToolHandler(args);
  }

  @ResourceTemplate({
    description: Th.knowledgeBaseChunkResourceDescription,
    mimeType: Th.knowledgeBaseChunkMimeType,
    name: Th.knowledgeBaseChunkResourceName,
    uriTemplate: Th.knowledgeBaseChunkUriTemplate,
  })
  async readKnowledgeBaseChunkResource(params: Record<string, unknown>) {
    const idRaw = params['id'];
    const id =
      typeof idRaw === 'string'
        ? idRaw
        : Array.isArray(idRaw)
          ? idRaw[0]
          : undefined;
    const uriStr =
      id !== undefined && id !== ''
        ? `knowledge-base://chunk/${id}`
        : 'knowledge-base://chunk/';
    return Th.readKnowledgeBaseChunk(new URL(uriStr), { id });
  }

  @Tool({
    description: Th.semanticSearchToolDescription,
    name: 'semantic_search',
    parameters: asMcpParameters(Th.semanticSearchToolParameters),
  })
  semanticSearch(
    args: Parameters<typeof Th.semanticSearchToolHandler>[0],
  ): ReturnType<typeof Th.semanticSearchToolHandler> {
    return Th.semanticSearchToolHandler(args);
  }

  @Tool({
    description: Th.updateNoteToolDescription,
    name: 'update_note',
    parameters: asMcpParameters(Th.updateNoteToolParameters),
  })
  updateNote(
    args: Parameters<typeof Th.updateNoteToolHandler>[0],
  ): ReturnType<typeof Th.updateNoteToolHandler> {
    return Th.updateNoteToolHandler(args);
  }

  @Tool({
    description: Th.updatePlanToolDescription,
    name: 'update_plan',
    parameters: asMcpParameters(Th.updatePlanToolParameters),
  })
  updatePlan(
    args: Parameters<typeof Th.updatePlanToolHandler>[0],
  ): ReturnType<typeof Th.updatePlanToolHandler> {
    return Th.updatePlanToolHandler(args);
  }

  @Tool({
    description: Th.updateTaskToolDescription,
    name: 'update_task',
    parameters: asMcpParameters(Th.updateTaskToolParameters),
  })
  updateTask(
    args: Parameters<typeof Th.updateTaskToolHandler>[0],
  ): ReturnType<typeof Th.updateTaskToolHandler> {
    return Th.updateTaskToolHandler(args);
  }

  @Tool({
    description: Th.promoteTaskToolDescription,
    name: 'promote_task',
    parameters: asMcpParameters(Th.promoteTaskToolParameters),
  })
  promoteTask(
    args: Parameters<typeof Th.promoteTaskToolHandler>[0],
  ): ReturnType<typeof Th.promoteTaskToolHandler> {
    return Th.promoteTaskToolHandler(args);
  }
}
