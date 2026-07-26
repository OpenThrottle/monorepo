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
