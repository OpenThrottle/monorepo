/** Tab keys for the project detail page (`/projects/:projectId`). */
export const PROJECT_TAB_VALUES = ['overview', 'tasks'] as const;

export type ProjectTabValue = (typeof PROJECT_TAB_VALUES)[number];
