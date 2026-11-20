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

export const PROJECTS_ROW_ACTIONS_COPY = {
  menuAriaLabelPrefix: `Project actions for`,
  view: `View project`,
} as const;

export const PROJECT_REPOSITORIES_COPY = {
  addButton: `Link`,
  addLabel: `Link a repository`,
  addPlaceholder: `Select a repository`,
  empty: `No repositories are linked to this project yet.`,
  heading: `Repositories`,
  menuAriaLabelPrefix: `Repository actions for`,
  unlink: `Unlink repository`,
} as const;

export const PROJECT_PLANS_COPY = {
  addButton: `Add plan`,
  addLabel: `Add an existing plan`,
  addPlaceholder: `Select a plan`,
  empty: `No plans in this project yet. Add an existing plan to start the order.`,
  heading: `Plans`,
  menuAriaLabelPrefix: `Plan actions for`,
  moveDown: `Move down`,
  moveUp: `Move up`,
  openPlan: `Open plan`,
  remove: `Remove from project`,
} as const;
