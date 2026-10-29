import { useAtom } from 'jotai';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router';

import type { PromptType } from '../config';
import type { EditorAtom, EditorFile } from '../data/atom.editor';
import { editorAtom, filteredFilesAtom } from '../data/atom.editor';
import { getLanguageFromExt } from '../utils';

export interface UseEditorOptions {
  readonly basePath?: string;
}

/**
 * @description The editor state and file operations returned by {@link useEditor}.
 */
export interface UseEditorResult {
  readonly basePath: string;
  readonly closeFile: (filename: string) => void;
  readonly editor: EditorAtom;
  readonly filteredFiles: readonly EditorFile[];
  readonly openFile: (filename: string, id?: string) => void;
  readonly reorderFiles: (files: readonly EditorFile[]) => void;
  readonly setEditor: Dispatch<SetStateAction<EditorAtom>>;
  readonly setFiles: (files: readonly EditorFile[]) => void;
  readonly setLoading: (isLoading: boolean) => void;
  readonly setSearchQuery: (searchQuery: string) => void;
  readonly setSelectedType: (selectedType: PromptType | undefined) => void;
}

/**
 * @description Hook for interacting with the editor state and managing file operations.
 */
export const useEditor = (options?: UseEditorOptions): UseEditorResult => {
  const { basePath = '/prompts' } = options ?? {};

  // Hooks
  const navigate = useNavigate();
  const [editor, setEditor] = useAtom(editorAtom);
  const [filteredFiles] = useAtom(filteredFilesAtom);

  // Setup

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

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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
