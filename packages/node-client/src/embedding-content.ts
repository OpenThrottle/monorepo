/**
 * @description Builds text content for plan/task embeddings (used by MCP tool handlers).
 */

import type { PlanRow, TaskRow } from './openthrottle-client.ts';

/** @description Builds text content for plan embedding (title, description, summary, author, category). */
export function buildPlanContentForEmbedding(plan: PlanRow): string {
  const parts: string[] = [
    plan.title,
    plan.description ?? '',
    plan.summary ?? '',
    plan.author,
    plan.category,
  ];
  return parts.filter(Boolean).join('\n');
}

/** @description Builds text content for task embedding (title, description, summary, requirements). */
export function buildTaskContentForEmbedding(task: TaskRow): string {
  const parts: string[] = [
    task.title,
    task.description ?? '',
    task.summary ?? '',
  ];
  if (task.requirements.length > 0) {
    parts.push(task.requirements.map(String).join(' '));
  }
  return parts.filter(Boolean).join('\n');
}
