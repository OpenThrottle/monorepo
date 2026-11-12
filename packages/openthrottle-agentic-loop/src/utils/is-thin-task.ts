import type { LoopTask } from '../contract/index.ts';
import { THIN_TASK_MIN_CHARS } from '../data/data.constants.ts';

/**
 * @description A task whose trimmed title + description is shorter than the threshold AND whose
 * requirements are empty cannot be delegated (docs/workflows/ot-loop-job.md § 4).
 * @public
 */
export const isThinTask = (task: LoopTask): boolean => {
  const length = task.title.trim().length + task.description.trim().length;

  return length < THIN_TASK_MIN_CHARS && task.requirements.length === 0;
};
