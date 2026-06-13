/**
 * @description Single-sourced user-facing copy for the plans routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const PLAN_TASK_NOT_FOUND_COPY = {
  description: `The task you are looking for does not exist.`,
  title: `Task not found`,
} as const;
