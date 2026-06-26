import { useAtom } from 'jotai';
import { useNavigate } from 'react-router';
import { editorAtom, filteredFilesAtom } from '../data/atom.editor';
import type { EditorFile } from '../data/atom.editor';
import type { PromptType } from '../config';
import { getLanguageFromExt } from '../utils';

export interface UseEditorOptions {
  readonly basePath?: string;
}

/**
 * @description Hook for interacting with the editor state and managing file operations.
 */
export const useEditor = (options?: UseEditorOptions) => {
  const { basePath = '/prompts' } = options ?? {};

  // Hooks
  const navigate = useNavigate();
  const [editor, setEditor] = useAtom(editorAtom);
  const [filteredFiles] = useAtom(filteredFilesAtom);

  // Handlers
  const closeFile = (filename: string): void => {
    setEditor((current) => {
      const newTabs = current.tabs.filter((file) => file.filename !== filename);
      const wasActive = current.filename === filename;
      const newFilename = wasActive
        ? newTabs[newTabs.length - 1]?.filename
        : current.filename;

      return {
        ...current,
        filename: newFilename,
        tabs: newTabs,
      };
    });

    navigate(basePath, { preventScrollReset: true });
  };

  const openFile = (filename: string, id?: string): void => {
    setEditor((current) => {
      const existingTab = current.tabs.find(
        (file) => file.filename === filename,
      );

      if (existingTab) {
        return { ...current, filename };
      }

      const existingFile = current.files.find(
        (file) => file.filename === filename,
      );

      const extension = filename.split('.').pop() ?? 'md';

      const language = getLanguageFromExt(extension);

      const newFile: EditorFile = existingFile ?? {
        directory: '.',
        filename,
        id,
        language,
      };

      const newTabs = [...current.tabs, newFile];

      return { ...current, filename, tabs: newTabs };
    });

    const encodedFilename = encodeURIComponent(filename);
    navigate(`${basePath}/${encodedFilename}`, { preventScrollReset: true });
  };

  const reorderFiles = (files: readonly EditorFile[]): void => {
    setEditor((current) => ({ ...current, tabs: files }));
  };

  const setFiles = (files: readonly EditorFile[]): void => {
    setEditor((current) => ({ ...current, files }));
  };

  const setLoading = (isLoading: boolean): void => {
    setEditor((current) => ({ ...current, isLoading }));
  };

  const setSearchQuery = (searchQuery: string): void => {
    setEditor((current) => ({ ...current, searchQuery }));
  };

  const setSelectedType = (selectedType: PromptType | undefined): void => {
    setEditor((current) => ({ ...current, selectedType }));
  };

  return {
    basePath,
    closeFile,
    editor,
    filteredFiles,
    openFile,
    reorderFiles,
    setEditor,
    setFiles,
    setLoading,
    setSearchQuery,
    setSelectedType,
  };
};
