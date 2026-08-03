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
  addVariationButton: 'Add variation',
  allocationLabel: 'Allocation',
  allocationSummaryEmpty: '—',
  createButton: 'New flag',
  createDescription:
    'Create a typed feature flag with variations and percentage fallthrough. Role targeting is all-or-nothing before the split.',
  createTitle: 'Create a feature flag',
  deleteButton: 'Delete',
  deleteConfirm: 'Delete this feature flag? This cannot be undone.',
  descriptionHelp: 'Optional. What does this flag gate?',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Gates the redesigned dashboard',
  editButton: 'Edit',
  editDescription:
    'Update the flag key, type, variations, fallthrough weights, targeting, and state.',
  editTitle: 'Edit feature flag',
  emptyState: 'No feature flags yet. Create one to get started.',
  enabledHelp: 'When off, eligible actors receive the off / default variation.',
  enabledLabel: 'Enabled',
  fallthroughHelp:
    'Integer percent weights assigned when the flag is enabled and targeting passes. Weights must sum to 100.',
  fallthroughIndexError: 'Fallthrough points at an unknown variation.',
  fallthroughLabel: 'Fallthrough allocation',
  fallthroughParseError: 'Fallthrough allocation could not be parsed.',
  fallthroughSumError: 'Fallthrough weights must sum to 100.',
  fallthroughSumStatusPrefix: 'Weights total ',
  fallthroughSumStatusSuffix: '% (must be 100).',
  fallthroughWeightLabel: 'Weight %',
  fallthroughWeightRangeError: 'Each weight must be an integer from 0 to 100.',
  intro:
    'Rollout is OpenThrottle’s feature-flagging system. Flags are typed (boolean, string, number, json), optionally targeted to RBAC roles, and evaluated server-side with percentage fallthrough.',
  keyHelp: 'Unique, stable identifier used in code (e.g. new-dashboard).',
  keyLabel: 'Key',
  keyPlaceholder: 'new-dashboard',
  kindHelp: 'Value type for every variation on this flag.',
  kindLabel: 'Type',
  kindRequiredError: 'A flag type is required.',
  offVariationError: 'Off variation must be a valid variation index.',
  offVariationHelp:
    'Returned when the flag is disabled or the actor fails role targeting.',
  offVariationLabel: 'Off / default variation',
  removeVariationButton: 'Remove',
  saveButton: 'Save changes',
  targetRolesHelp:
    'Comma-separated RBAC role names (e.g. admin, viewer). Leave blank to enable for everyone.',
  targetRolesLabel: 'Target roles',
  targetRolesPlaceholder: 'admin, viewer',
  title: 'Rollout',
  variationBooleanInvalid: 'Boolean variation must be true or false.',
  variationDescriptionLabel: 'Variation notes',
  variationDescriptionPlaceholder: 'Optional notes',
  variationIndexPrefix: 'Variation ',
  variationJsonInvalid: 'JSON variation must be valid JSON.',
  variationJsonPlaceholder: '{"enabled":true}',
  variationNameLabel: 'Name',
  variationNamePlaceholder: 'control',
  variationNumberInvalid: 'Number variation must be a finite number.',
  variationShapeError: 'Each variation needs a valueJson string',
  variationStringInvalid: 'String variation valueJson must be a JSON string.',
  variationValueLabel: 'Value',
  variationsHelp: 'At least two variations. Values must match the flag type.',
  variationsLabel: 'Variations',
  variationsMinError: 'A flag needs at least two variations.',
  variationsParseError: 'Variations could not be parsed.',
} as const;
