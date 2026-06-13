/**
 * @description Single-sourced user-facing copy for the skills routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const SKILLS_EMPTY_COPY = {
  searchTitle: 'No skills found, try clearing the search to see all skills.',
  title: 'No skills found, create your first skill to get started.',
} as const;
