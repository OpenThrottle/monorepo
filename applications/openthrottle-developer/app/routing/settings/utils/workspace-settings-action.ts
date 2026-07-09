import type { WorkspaceEditorId } from '~/__generated__/graphql';
import { WorkspaceEditorId as WorkspaceEditorIdEnum } from '~/__generated__/graphql';

const WORKSPACE_EDITOR_VALUES = new Set<string>([
  WorkspaceEditorIdEnum.Cursor,
  WorkspaceEditorIdEnum.Vscode,
]);

const isWorkspaceEditorId = (value: string): value is WorkspaceEditorId =>
  WORKSPACE_EDITOR_VALUES.has(value);

/**
 * @description Parses enabled editor ids from form data (repeated `enabledEditors` fields).
 */
export const parseEnabledEditorsFromFormData = (
  formData: FormData,
): WorkspaceEditorId[] => {
  const raw = formData
    .getAll('enabledEditors')
    .filter((value): value is string => typeof value === 'string');

  const unique: WorkspaceEditorId[] = [];
  for (const value of raw) {
    if (!isWorkspaceEditorId(value)) {
      continue;
    }
    if (!unique.includes(value)) {
      unique.push(value);
    }
  }
  return unique;
};

/**
 * @description Returns trimmed string or null when empty.
 */
export const optionalTrimmedString = (
  value: FormDataEntryValue | null,
): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

/**
 * @description Parses optional project id; empty string clears the link.
 */
export const parseProjectIdFromFormData = (
  value: FormDataEntryValue | null,
): string | null | undefined => {
  if (value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '' || trimmed === '__none__') {
    return null;
  }
  return trimmed;
};
