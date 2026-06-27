import {
  FILE_EXTENSIONS,
  REGEX_KEBAB_CASE,
  REGEX_PASCAL_CASE,
} from '../config';
import type { EditorLanguage } from '../config';
import type { EditorFile } from '../data/atom.editor';

const FILE_EXTENSION_LANGUAGES: Readonly<Record<string, EditorLanguage>> =
  FILE_EXTENSIONS;

/**
 * @description Get the Monaco language identifier from a file extension.
 * Accepts any raw extension string; unknown extensions fall back to `markdown`.
 */
export const getLanguageFromExt = (ext: string): EditorLanguage => {
  const language = FILE_EXTENSION_LANGUAGES[ext.toLowerCase()];

  if (!language) {
    return 'markdown';
  }

  return language;
};

/**
 * @description Break down a full file path into its parts.
 */
export const parseFilePath = (
  path: string,
): {
  readonly extension: string;
  readonly language: EditorLanguage;
  readonly name: string;
  readonly parts: readonly string[];
  readonly path: string;
} => {
  const parts = path.split('/');
  const name = parts[parts.length - 1] ?? '';
  const extension = name.split('.').pop() ?? '';

  const language = getLanguageFromExt(extension);

  return {
    extension,
    language,
    name,
    parts,
    path: parts.join('/'),
  };
};

/**
 * @description Compares two EditorFile arrays to determine if they have been updated.
 */
export const areFilesUpdated = (
  newFiles: readonly EditorFile[],
  currentFiles: readonly EditorFile[],
): boolean => {
  if (newFiles === currentFiles) {
    return false;
  }

  if (newFiles.length !== currentFiles.length) {
    return true;
  }

  const currentFilesMap = new Map<string, EditorFile>();

  currentFiles.forEach((file) => {
    const key = `${file.directory}/${file.filename}`;
    currentFilesMap.set(key, file);
  });

  for (const newFile of newFiles) {
    const key = `${newFile.directory}/${newFile.filename}`;
    const currentFile = currentFilesMap.get(key);

    if (!currentFile) {
      return true;
    }

    if (currentFile.language !== newFile.language) {
      return true;
    }
  }

  return false;
};

/**
 * @description Validates a filename for proper format and naming conventions.
 */
export const validateFilename = (filename: string): boolean => {
  const trimmed = filename.trim();

  if (!trimmed) {
    return false;
  }

  const lastDotIndex = trimmed.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === trimmed.length - 1) {
    return false;
  }

  const extension = trimmed.substring(lastDotIndex + 1).toLowerCase();
  const nameWithoutExt = trimmed.substring(0, lastDotIndex);

  if (!(extension in FILE_EXTENSIONS)) {
    return false;
  }

  if (extension === 'tsx' || extension === 'jsx') {
    return REGEX_PASCAL_CASE.test(nameWithoutExt);
  }

  if (extension === 'md' || extension === 'mdc') {
    return (
      REGEX_KEBAB_CASE.test(nameWithoutExt) ||
      REGEX_PASCAL_CASE.test(nameWithoutExt)
    );
  }

  return true;
};

/**
 * @description Gets a specific error message for filename validation failures.
 */
export const getFilenameError = (filename: string): string => {
  const trimmed = filename.trim();

  if (!trimmed) {
    return 'Filename cannot be empty';
  }

  const lastDotIndex = trimmed.lastIndexOf('.');

  if (lastDotIndex === -1 || lastDotIndex === trimmed.length - 1) {
    return 'File extension is required';
  }

  const extension = trimmed.substring(lastDotIndex + 1).toLowerCase();
  const nameWithoutExt = trimmed.substring(0, lastDotIndex);

  if (!(extension in FILE_EXTENSIONS)) {
    const supported = Object.keys(FILE_EXTENSIONS).join(', ');
    return `Unsupported file extension. Supported: ${supported}`;
  }

  if (extension === 'tsx' || extension === 'jsx') {
    if (!REGEX_PASCAL_CASE.test(nameWithoutExt)) {
      return 'TSX/JSX component files must be in PascalCase (e.g., MyComponent.tsx)';
    }
  }

  if (extension === 'md' || extension === 'mdc') {
    if (
      !REGEX_KEBAB_CASE.test(nameWithoutExt) &&
      !REGEX_PASCAL_CASE.test(nameWithoutExt)
    ) {
      return 'Markdown files must be in kebab-case (e.g., my-prompt.md) or PascalCase (e.g., MyPrompt.md)';
    }
  }

  return '';
};

/**
 * @description Determines if a filename represents a hidden file.
 */
export const isHiddenFile = (filename: string): boolean => {
  const name = filename.split('/').pop() ?? filename;
  return name.startsWith('.');
};
