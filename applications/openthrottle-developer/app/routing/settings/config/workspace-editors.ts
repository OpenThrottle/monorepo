import { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorOption {
  readonly label: string;
  readonly value: WorkspaceEditorId;
}

export const WORKSPACE_EDITOR_OPTIONS: readonly WorkspaceEditorOption[] = [
  { label: 'Cursor', value: WorkspaceEditorId.Cursor },
  { label: 'Visual Studio Code', value: WorkspaceEditorId.Vscode },
];
