import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description Moves the user's default editor to the front of an enabled-editor
 * list so multi-editor button groups lead with it (D5). Never adds the default:
 * an editor that is not enabled stays out of the group, and the rest keep their
 * order. `null` (system default) returns the list unchanged.
 */
export const orderEditorsDefaultFirst = (
  editors: readonly WorkspaceEditorId[],
  defaultEditor: WorkspaceEditorId | null,
): readonly WorkspaceEditorId[] => {
  if (defaultEditor === null || !editors.includes(defaultEditor)) {
    return editors;
  }

  return [
    defaultEditor,
    ...editors.filter((editor) => editor !== defaultEditor),
  ];
};
