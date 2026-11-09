import type { WORKSPACE_EDITORS } from './workspace-settings.constants.ts';
export type WorkspaceEditorId =
  (typeof WORKSPACE_EDITORS)[keyof typeof WORKSPACE_EDITORS];
