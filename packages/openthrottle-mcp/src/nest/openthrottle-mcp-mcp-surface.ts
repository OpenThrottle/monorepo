/**
 * @description Nest MCP tool and resource registrations mirroring the stdio server — delegates to shared GraphQL-only handlers in `nest-tool-handlers`.
 */

import { Injectable } from '@nestjs/common';
import { ResourceTemplate, Tool } from '@rekog/mcp-nest';
import * as Th from '../nest-tool-handlers.js';
import { z } from 'zod';

/**
 * @description Bridges Zod codegen schemas to `@rekog/mcp-nest` `@Tool` parameter typing (`z.ZodType`).
 */
const asMcpParameters = (schema: unknown): z.ZodType => schema as z.ZodType;

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
    description: Th.linkCommitToolDescription,
    name: 'link_commit',
    parameters: asMcpParameters(Th.linkCommitToolParameters),
  })
  linkCommit(
    args: Parameters<typeof Th.linkCommitToolHandler>[0],
  ): ReturnType<typeof Th.linkCommitToolHandler> {
    return Th.linkCommitToolHandler(args);
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
}
