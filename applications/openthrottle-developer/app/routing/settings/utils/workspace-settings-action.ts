import { isWorkspaceEditorId } from '~/global/config/workspace-editors';
import type { WorkspaceEditorId } from '~/__generated__/graphql';

/**
 * @description Parses enabled editor ids from form data (repeated `enabledEditors` fields).
 * Unknown ids are dropped, so the guard must be {@link isWorkspaceEditorId} —
 * a hardcoded copy silently discards any newly supported editor at save time
 * while the picker still offers it. That is not hypothetical: this parser once
 * held its own `new Set<string>([Cursor, Vscode])`, which let Claude Code appear
 * checked in the picker and vanish on save.
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
