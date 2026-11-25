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
  addButton: `Add plans`,
  addButtonCountPrefix: `Add`,
  addButtonCountSuffix: `plans`,
  addEmpty: `No plans match.`,
  addFailedPrefix: `Couldn't add`,
  addPlaceholder: `Add existing plans…`,
  addSearch: `Search plans…`,
  empty: `No plans in this project yet. Add an existing plan to start the order.`,
  heading: `Plans`,
  inOtherProjectPrefix: `in`,
  menuAriaLabelPrefix: `Plan actions for`,
  moveDown: `Move down`,
  moveUp: `Move up`,
  newPlanCopy: `Copy new-plan prompt`,
  openPlan: `Open plan`,
  remove: `Remove from project`,
} as const;

export const PROJECT_PLAN_TASKS_COPY = {
  empty: `This plan has no tasks yet.`,
  error: `Couldn't load this plan's tasks.`,
  loading: `Loading tasks…`,
  retry: `Retry`,
  showAllPrefix: `Show all`,
  showAllSuffix: `tasks`,
  showFewer: `Show fewer`,
  toggleAriaLabelPrefix: `Tasks for`,
} as const;

export const PROJECT_FORM_COPY = {
  cancel: `Cancel`,
  createSubmit: `Create project`,
  descriptionLabel: `Description (optional)`,
  descriptionPlaceholder: `What this initiative is for and what done looks like`,
  nameLabel: `Name`,
  nameMissing: `Project name is required.`,
  namePlaceholder: `Project name`,
  repositoriesEmpty: `No repositories match.`,
  repositoriesHint: `Plans in this project can run against any linked repository. You can change this later.`,
  repositoriesLabel: `Repositories (optional)`,
  repositoriesPlaceholder: `Link repositories`,
  repositoriesSearch: `Search repositories…`,
  saveSubmit: `Save changes`,
} as const;

export const PROJECTS_INDEX_COPY = {
  addRepository: `Add repository`,
  description: `Projects are initiatives: an ordered list of plans across one or more linked repositories. Each row shows how many of its plans are completed.`,
  heading: `Projects`,
  newProject: `New project`,
} as const;

export const PROJECT_CREATE_COPY = {
  breadcrumb: `New project`,
  createFailed: `Failed to create project.`,
  heading: `New project`,
  metaTitle: `New project`,
} as const;

export const PROJECT_EDIT_COPY = {
  breadcrumb: `Edit`,
  deleteFailed: `Failed to delete project.`,
  headingPrefix: `Edit`,
  updateFailed: `Failed to update project.`,
} as const;

export const PROJECT_DELETE_COPY = {
  cancel: `Keep project`,
  confirm: `Delete project`,
  confirmDescription: `Its plans, tasks and their history are kept; they just stop belonging to a project.`,
  confirmTitlePrefix: `Delete`,
  description: `Removes the project from your workspace. Its plans are kept and become unassigned.`,
  heading: `Delete project`,
  trigger: `Delete project`,
} as const;
