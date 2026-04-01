export type PromptsSortBy = 'createdAt' | 'title' | 'updatedAt';
export const PROMPTS_SORT_BY: readonly PromptsSortBy[] = [
  'createdAt',
  'title',
  'updatedAt',
];

export type PromptsSortOrder = 'asc' | 'desc';
export const PROMPTS_SORT_ORDER: readonly PromptsSortOrder[] = ['asc', 'desc'];

export type ProjectsSortBy = 'createdAt' | 'name' | 'updatedAt';
export const PROJECTS_SORT_BY: readonly ProjectsSortBy[] = [
  'createdAt',
  'name',
  'updatedAt',
];

export type ProjectsSortOrder = 'asc' | 'desc';
export const PROJECTS_SORT_ORDER: readonly ProjectsSortOrder[] = [
  'asc',
  'desc',
];
