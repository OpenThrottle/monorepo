import { WorkspaceEditorId } from '~/__generated__/graphql';

interface WorkspaceEditorOption {
  readonly label: string;
  readonly value: WorkspaceEditorId;
}

/**
 * Display name per supported editor. Exhaustive over `WorkspaceEditorId`: adding an
 * editor to the schema fails typecheck here until it is given a label.
 */
export const WORKSPACE_EDITOR_LABELS: Record<WorkspaceEditorId, string> = {
  [WorkspaceEditorId.Claude]: 'Claude Code',
  [WorkspaceEditorId.Cursor]: 'Cursor',
  [WorkspaceEditorId.Vscode]: 'Visual Studio Code',
};

/**
 * Picker options, derived from the labels map rather than hand-listed.
 */
export const WORKSPACE_EDITOR_OPTIONS: readonly WorkspaceEditorOption[] =
  Object.values(WorkspaceEditorId).map((value) => ({
    label: WORKSPACE_EDITOR_LABELS[value],
    value,
  }));
