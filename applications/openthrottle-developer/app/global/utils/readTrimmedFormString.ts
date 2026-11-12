/**
 * @description Reads a `FormData` entry as trimmed text; a missing or non-string
 * entry (such as a file upload) reads as the empty string.
 */
export const readTrimmedFormString = (
  value: FormDataEntryValue | null,
): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};
