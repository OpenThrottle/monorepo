import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description Order-insensitive comparison of an editor selection against the
 * stored one. The two arrays are not guaranteed to share order, so a positional
 * compare would report a phantom change and re-enable Save for a no-op save.
 */
export const hasWorkspaceEditorSelectionChanged = (
  next: readonly WorkspaceEditorId[],
  stored: readonly WorkspaceEditorId[],
): boolean => {
  if (next.length !== stored.length) return true;

  const storedSet = new Set<WorkspaceEditorId>(stored);
  return next.some((editor) => !storedSet.has(editor));
};

/** Selection with `editor` added or removed, preserving catalog order. */
export const toggleWorkspaceEditor = (
  current: readonly WorkspaceEditorId[],
  editor: WorkspaceEditorId,
  next: boolean,
): WorkspaceEditorId[] =>
  next
    ? current.includes(editor)
      ? [...current]
      : [...current, editor]
    : current.filter((entry) => entry !== editor);
