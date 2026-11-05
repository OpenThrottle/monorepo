import { BLOG_EDITOR_COPY } from '~/routing/blog/data/data.copy';

export interface ResolveSaveStatusInput {
  readonly isDirty: boolean;
  readonly isSaved: boolean;
  readonly isSaving: boolean;
}

/**
 * @description The editor's save status line: saving beats unsaved, which beats
 * saved. `null` when there is nothing to report.
 */
export const resolveSaveStatus = (
  input: ResolveSaveStatusInput,
): string | null => {
  const { isDirty, isSaved, isSaving } = input;

  if (isSaving) {
    return BLOG_EDITOR_COPY.saving;
  }
  if (isDirty) {
    return BLOG_EDITOR_COPY.unsaved;
  }
  if (isSaved) {
    return BLOG_EDITOR_COPY.saved;
  }

  return null;
};
