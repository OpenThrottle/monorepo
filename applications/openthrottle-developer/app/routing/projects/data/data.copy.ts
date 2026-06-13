/**
 * @description Single-sourced user-facing copy for the projects routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const PROJECT_NOT_FOUND_COPY = {
  description: `The project you're looking for doesn't exist or was removed.`,
  title: `Project not found`,
} as const;
