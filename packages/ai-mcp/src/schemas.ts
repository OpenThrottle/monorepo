/**
 * @description Zod input schemas for MCP tool parameters. Shared and testable.
 */

import { z } from 'zod';
import { MAX_LIMIT } from './constants.ts';

// Note CRUD
export const createNoteInputSchema = z.object({
  author: z.string().nullable().optional(),
  content: z.string().min(1),
});
export const getNoteInputSchema = z.object({ id: z.uuid() });
export const listNotesInputSchema = z.object({
  author: z.string().nullable().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export const updateNoteInputSchema = z.object({
  author: z.string().nullable().optional(),
  content: z.string().min(1).optional(),
  id: z.uuid(),
});
export const deleteNoteInputSchema = z.object({ id: z.uuid() });

// Search & list
export const semanticSearchInputSchema = z.object({
  limit: z.number().int().min(1).max(MAX_LIMIT).optional(),
  query: z.string().min(1),
});
export const getDocumentInputSchema = z.object({ id: z.uuid() });
export const listPlansByStatusInputSchema = z.object({
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  status: z.string().min(1),
});

// Plan CRUD
export const createPlanInputSchema = z.object({
  assignee: z.string().nullable().optional(),
  author: z.string().min(1),
  category: z.string().min(1),
  description: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  status: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  title: z.string().min(1),
});
export const getPlanInputSchema = z.object({ id: z.uuid() });
export const updatePlanInputSchema = z.object({
  assignee: z.string().nullable().optional(),
  author: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  id: z.uuid(),
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  status: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
});
export const deletePlanInputSchema = z.object({ id: z.uuid() });

// Task CRUD
export const createTaskInputSchema = z.object({
  assignee: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  planId: z.uuid(),
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  requirements: z.array(z.unknown()).optional(),
  status: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  title: z.string().min(1),
});
const createTasksItemSchema = z.object({
  assignee: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  requirements: z.array(z.unknown()).optional(),
  status: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  title: z.string().min(1),
});
export const createTasksInputSchema = z.object({
  planId: z.uuid(),
  tasks: z.array(createTasksItemSchema).min(1),
});
export const getTaskInputSchema = z.object({ id: z.uuid() });
export const getRemainingTasksForPlanInputSchema = z.object({
  planId: z.uuid(),
});
export const getTasksByPlanIdInputSchema = z.object({
  planId: z.uuid(),
});
export const listTasksByCategoryInputSchema = z.object({
  category: z.string().min(1),
  limit: z.number().int().min(1).max(200).optional(),
  planId: z.uuid().optional(),
  status: z.string().min(1).optional(),
});
export const updateTaskInputSchema = z.object({
  assignee: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  id: z.uuid(),
  planId: z.uuid().optional(),
  project: z.string().nullable().optional(),
  projectId: z.uuid().nullable().optional(),
  requirements: z.array(z.unknown()).optional(),
  status: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  title: z.string().min(1).optional(),
});
export const deleteTaskInputSchema = z.object({ id: z.uuid() });

// Commit link
export const linkCommitInputSchema = z.object({
  message: z.string().nullable().optional(),
  planId: z.uuid(),
  repo: z.string().min(1),
  sha: z.string().min(1),
  taskId: z.uuid().nullable().optional(),
});

// Plan output
export const appendPlanOutputInputSchema = z.object({
  content: z.string().min(1),
  iteration: z.number().int().optional(),
  planId: z.uuid(),
});
export const getPlanOutputInputSchema = z.object({
  planId: z.uuid(),
});

// Activity
export const getLastActivityInputSchema = z.object({
  planId: z.uuid(),
  taskId: z.uuid().optional(),
});
export const getActivityByDateInputSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
      .optional(),
    daysBack: z.number().int().min(1).max(365).optional(),
  })
  .refine((d) => d.date != null || d.daysBack != null, {
    message: 'Provide either date (YYYY-MM-DD) or daysBack (1–365).',
  });
