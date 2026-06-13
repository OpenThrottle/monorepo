/**
 * @description Single-sourced user-facing copy for the prompts routing area. The
 * component renders these and specs import the same constants, so a wording change
 * updates one place and no spec breaks on copy drift. Add new copy here rather than
 * inlining sentence-length literals in components.
 */

export const PROMPTS_EMPTY_COPY = {
  description: 'Create your first prompt to get started.',
  searchDescription: 'Try clearing the search to see all prompts.',
  searchTitle: 'No prompts match your filters',
  title: 'No prompts yet',
} as const;
