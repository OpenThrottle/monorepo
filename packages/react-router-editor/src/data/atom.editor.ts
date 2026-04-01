import { atom } from 'jotai';
import type { EditorLanguage, PromptType } from '../config';

/**
 * @description Represents a file in the editor.
 */
export interface EditorFile {
  readonly directory: string;
  readonly filename: string;
  readonly id?: string;
  readonly labels?: readonly string[];
  readonly language: EditorLanguage;
  readonly promptType?: PromptType;
}

/**
 * @description Editor state managed by Jotai atoms.
 */
export interface EditorAtom {
  readonly filename: string | undefined;
  readonly files: readonly EditorFile[];
  readonly isLoading: boolean;
  readonly searchQuery: string;
  readonly selectedType: PromptType | undefined;
  readonly tabIndex: number;
  readonly tabs: readonly EditorFile[];
}

/**
 * @description Default state for the editor atom.
 */
export const editorAtomDefaults: EditorAtom = {
  filename: undefined,
  files: [],
  isLoading: false,
  searchQuery: '',
  selectedType: undefined,
  tabIndex: 0,
  tabs: [],
};

/**
 * @description Main Jotai atom for editor state.
 */
export const editorAtom = atom<EditorAtom>(editorAtomDefaults);

/**
 * @description Derived atom for filtered files based on search and type filter.
 */
export const filteredFilesAtom = atom((get) => {
  const editor = get(editorAtom);
  const { files, searchQuery, selectedType } = editor;

  return files.filter((file) => {
    const matchesSearch =
      !searchQuery ||
      file.filename.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = !selectedType || file.promptType === selectedType;

    return matchesSearch && matchesType;
  });
});
