/**
 * @description Hardcoded copy for the workspace add-folder onboarding flow.
 * Imported via the settings route components.
 */

export const WORKSPACE_FOLDERS_COPY = {
  addFolderButton: 'Add folder',
  addFolderDescription:
    'Pick a repository discovered under your configured workspace roots. These are folders on the machine running openthrottle-server, not your browser.',
  addFolderTitle: 'Add a folder',
  advancedPathHint:
    'Absolute path on the server host. Use this only when the folder is outside your configured workspace roots.',
  advancedPathToggle: 'Enter a server path manually',
  alreadyRegisteredBadge: 'Already added',
  applyEditorConfigButton: 'Apply editor configuration',
  browseEmpty: 'No subdirectories found here.',
  browseHint:
    'Browse inside your workspace roots when the folder is nested deeper than one level.',
  cloneRepoButton: 'Clone repo',
  cloneRepoDescription:
    'Clone a git repository onto the machine running openthrottle-server. It is cloned with ambient host credentials (SSH agent / gh) into the configured checkout root — OpenThrottle stores no secrets.',
  cloneRepoNameLabel: 'Folder name (optional)',
  cloneRepoTitle: 'Clone a repository',
  cloneRepoUrlLabel: 'Git URL',
  detailsButton: 'Details',
  discoveredEmpty:
    'No git repositories found under the configured workspace roots. Set OPENTHROTTLE_WORKSPACE_ROOTS on the server to enable discovery, or enter a path manually below.',
  driftBranchMoved: 'Branch changed since last scan',
  driftPathMissing: 'Folder is missing on disk',
  driftRemoteChanged: 'Remote changed since last scan',
  managedBadge: 'Managed',
  mergedNotice:
    'This folder turned out to be the same repository as an existing one — it now shares that repository and its project link.',
  projectCreatedSuffix: '(created)',
  projectLinkedPrefix: 'Linked to project',
  refreshButton: 'Refresh',
  removeButton: 'Remove',
  repositoriesEmpty:
    'No repositories yet. Add a folder to register your first checkout.',
  sectionDescription:
    'Repositories are identified by their git remote; each entry below groups your on-disk checkouts on the server host.',
} as const;

/**
 * @description Copy for the workspace repository details and edit routes.
 */
export const WORKSPACE_REPOSITORY_DETAIL_COPY = {
  backToWorkspace: 'Back to Workspace',
  branchHelp: 'The branch runs and checkouts default to.',
  branchLabel: 'Default branch',
  branchPlaceholder: 'e.g. main',
  cancelButton: 'Cancel',
  checkoutsEmpty: 'No checkouts registered for this repository.',
  checkoutsHeading: 'Checkouts',
  editButton: 'Edit',
  editDescription:
    'Rename this repository, set its default branch, and link it to an OpenThrottle project. Renaming is display-only and does not touch the git remote.',
  editTitle: 'Edit repository',
  nameHelp:
    'A human-readable label. Include the org (e.g. acme/monorepo) to tell repositories with the same name apart.',
  nameLabel: 'Name',
  namePlaceholder: 'e.g. acme/monorepo',
  noProject: 'No project linked',
  projectLabel: 'Linked project',
  remoteLabel: 'Remote',
  remoteLocalOnly: 'Local only (no remote detected)',
  saveButton: 'Save changes',
} as const;

/**
 * @description Copy for the rollout (feature-flagging) settings routes.
 */
export const ROLLOUT_COPY = {
  createButton: 'New flag',
  createDescription:
    'Feature flags gate functionality by RBAC role. A flag is on when enabled and either untargeted (everyone) or the actor holds a targeted role.',
  createTitle: 'Create a feature flag',
  deleteButton: 'Delete',
  deleteConfirm: 'Delete this feature flag? This cannot be undone.',
  descriptionHelp: 'Optional. What does this flag gate?',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Gates the redesigned dashboard',
  editButton: 'Edit',
  editDescription: 'Update the flag key, description, targeting, and state.',
  editTitle: 'Edit feature flag',
  emptyState: 'No feature flags yet. Create one to get started.',
  enabledHelp:
    'When off, the flag is off for everyone regardless of targeting.',
  enabledLabel: 'Enabled',
  intro:
    'Rollout is OpenThrottle’s feature-flagging system. Flags are global or targeted to RBAC roles and evaluated server-side.',
  keyHelp: 'Unique, stable identifier used in code (e.g. new-dashboard).',
  keyLabel: 'Key',
  keyPlaceholder: 'new-dashboard',
  saveButton: 'Save changes',
  targetRolesHelp:
    'Comma-separated RBAC role names (e.g. admin, viewer). Leave blank to enable for everyone.',
  targetRolesLabel: 'Target roles',
  targetRolesPlaceholder: 'admin, viewer',
  title: 'Rollout',
} as const;
