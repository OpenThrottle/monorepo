import { isWorkspaceEditorId } from '~/routing/settings/utils/is-workspace-editor-id';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description Parses enabled editor ids from form data (repeated `enabledEditors` fields).
 * Unknown ids are dropped, so the guard must stay derived from
 * {@link WORKSPACE_EDITOR_OPTIONS} — a hardcoded copy silently discards any
 * newly supported editor at save time while the picker still offers it.
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
