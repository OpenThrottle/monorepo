import { WorkspaceEditorId } from '~/__generated__/graphql';

export interface WorkspaceEditorDeepLink {
  /** Button copy identifying the editor ("Open in {label}"). */
  readonly label: string;
  /** URL scheme the editor registers for `<scheme>://file<absolutePath>` links. */
  readonly scheme: string;
}

/**
 * Deep-link metadata per supported editor. Exhaustive over `WorkspaceEditorId`
 * on purpose: adding an editor to the schema fails typecheck here until its
 * scheme is declared, rather than silently rendering a dead link.
 */
export const WORKSPACE_EDITOR_DEEP_LINKS: Readonly<
  Record<WorkspaceEditorId, WorkspaceEditorDeepLink>
> = {
  [WorkspaceEditorId.Cursor]: { label: 'Cursor', scheme: 'cursor' },
  [WorkspaceEditorId.Vscode]: { label: 'VS Code', scheme: 'vscode' },
};

/**
 * Resolve deep-link metadata for an editor id, tolerating ids the server knows
 * but this client's generated enum does not yet.
 */
export const getWorkspaceEditorDeepLink = (
  editor: WorkspaceEditorId,
): WorkspaceEditorDeepLink | null => {
  return WORKSPACE_EDITOR_DEEP_LINKS[editor] ?? null;
};
