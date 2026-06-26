import { createStore } from 'jotai';
import { describe, expect, test } from 'vitest';
import {
  editorAtom,
  editorAtomDefaults,
  filteredFilesAtom,
} from '../atom.editor';
import type { EditorAtom, EditorFile } from '../atom.editor';

const file = (overrides: Partial<EditorFile> = {}): EditorFile => ({
  directory: '.',
  filename: 'readme.md',
  language: 'markdown',
  ...overrides,
});

const seed = (overrides: Partial<EditorAtom> = {}) => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, ...overrides });
  return store;
};

describe('data/filteredFilesAtom', () => {
  test('returns every file when no search query or type is set', () => {
    const files = [file({ filename: 'a.md' }), file({ filename: 'b.ts' })];
    const store = seed({ files });

    expect(store.get(filteredFilesAtom)).toEqual(files);
  });

  test('filters by case-insensitive substring search on filename', () => {
    const store = seed({
      files: [file({ filename: 'Agent.md' }), file({ filename: 'helper.ts' })],
      searchQuery: 'AGENT',
    });

    const result = store.get(filteredFilesAtom);

    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('Agent.md');
  });

  test('filters by selected prompt type', () => {
    const store = seed({
      files: [
        file({ filename: 'a.md', promptType: 'agents' }),
        file({ filename: 'b.md', promptType: 'skills' }),
      ],
      selectedType: 'skills',
    });

    const result = store.get(filteredFilesAtom);

    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('b.md');
  });

  test('applies search and type filters together', () => {
    const store = seed({
      files: [
        file({ filename: 'alpha.md', promptType: 'agents' }),
        file({ filename: 'alpha.ts', promptType: 'skills' }),
        file({ filename: 'beta.md', promptType: 'agents' }),
      ],
      searchQuery: 'alpha',
      selectedType: 'agents',
    });

    const result = store.get(filteredFilesAtom);

    expect(result).toHaveLength(1);
    expect(result[0]?.filename).toBe('alpha.md');
  });

  test('returns an empty array when nothing matches', () => {
    const store = seed({
      files: [file({ filename: 'a.md', promptType: 'agents' })],
      selectedType: 'commands',
    });

    expect(store.get(filteredFilesAtom)).toEqual([]);
  });
});
