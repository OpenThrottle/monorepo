import * as React from 'react';
import { act, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorAtom, EditorFile } from '../../data/atom.editor';
import { useEditor } from '../useEditor';

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const file = (overrides: Partial<EditorFile> = {}): EditorFile => ({
  directory: '.',
  filename: 'readme.md',
  language: 'markdown',
  ...overrides,
});

const renderUseEditor = (
  initial: Partial<EditorAtom> = {},
  options?: Parameters<typeof useEditor>[0],
) => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, ...initial });

  const wrapper = ({ children }: { readonly children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  const view = renderHook(() => useEditor(options), { wrapper });

  return { store, view };
};

describe('hooks/useEditor', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  describe('openFile', () => {
    test('opens a new tab, activates it, and navigates to the encoded path', () => {
      const { store, view } = renderUseEditor();

      act(() => {
        view.result.current.openFile('my-prompt.md');
      });

      const state = store.get(editorAtom);
      expect(state.tabs).toHaveLength(1);
      expect(state.tabs[0]?.filename).toBe('my-prompt.md');
      expect(state.tabs[0]?.language).toBe('markdown');
      expect(state.filename).toBe('my-prompt.md');
      expect(mockNavigate).toHaveBeenCalledWith('/prompts/my-prompt.md', {
        preventScrollReset: true,
      });
    });

    test('encodes special characters in the navigation path', () => {
      const { view } = renderUseEditor();

      act(() => {
        view.result.current.openFile('a b.md');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/prompts/a%20b.md', {
        preventScrollReset: true,
      });
    });

    test('reuses an existing tab without duplicating it', () => {
      const existing = file({ filename: 'a.md' });
      const { store, view } = renderUseEditor({ tabs: [existing] });

      act(() => {
        view.result.current.openFile('a.md');
      });

      const state = store.get(editorAtom);
      expect(state.tabs).toHaveLength(1);
      expect(state.filename).toBe('a.md');
    });

    test('reuses the known file entry when opening from the file list', () => {
      const known = file({
        filename: 'b.ts',
        id: '42',
        language: 'typescript',
      });
      const { store, view } = renderUseEditor({ files: [known] });

      act(() => {
        view.result.current.openFile('b.ts');
      });

      const state = store.get(editorAtom);
      expect(state.tabs[0]).toEqual(known);
    });

    test('derives the language from the extension for unknown files', () => {
      const { store, view } = renderUseEditor();

      act(() => {
        view.result.current.openFile('Widget.tsx');
      });

      expect(store.get(editorAtom).tabs[0]?.language).toBe('typescript');
    });

    test('honors a custom basePath', () => {
      const { view } = renderUseEditor({}, { basePath: '/docs' });

      act(() => {
        view.result.current.openFile('a.md');
      });

      expect(mockNavigate).toHaveBeenCalledWith('/docs/a.md', {
        preventScrollReset: true,
      });
    });
  });

  describe('closeFile', () => {
    test('removes the tab and navigates back to the base path', () => {
      const { store, view } = renderUseEditor({
        filename: 'a.md',
        tabs: [file({ filename: 'a.md' })],
      });

      act(() => {
        view.result.current.closeFile('a.md');
      });

      const state = store.get(editorAtom);
      expect(state.tabs).toHaveLength(0);
      expect(state.filename).toBeUndefined();
      expect(mockNavigate).toHaveBeenCalledWith('/prompts', {
        preventScrollReset: true,
      });
    });

    test('activates the last remaining tab when closing the active file', () => {
      const { store, view } = renderUseEditor({
        filename: 'b.md',
        tabs: [file({ filename: 'a.md' }), file({ filename: 'b.md' })],
      });

      act(() => {
        view.result.current.closeFile('b.md');
      });

      const state = store.get(editorAtom);
      expect(state.tabs).toHaveLength(1);
      expect(state.filename).toBe('a.md');
    });

    test('keeps the active file when closing a non-active tab', () => {
      const { store, view } = renderUseEditor({
        filename: 'a.md',
        tabs: [file({ filename: 'a.md' }), file({ filename: 'b.md' })],
      });

      act(() => {
        view.result.current.closeFile('b.md');
      });

      const state = store.get(editorAtom);
      expect(state.tabs.map((tab) => tab.filename)).toEqual(['a.md']);
      expect(state.filename).toBe('a.md');
    });
  });

  describe('reorderFiles', () => {
    test('replaces the tab order with the provided files', () => {
      const a = file({ filename: 'a.md' });
      const b = file({ filename: 'b.md' });
      const { store, view } = renderUseEditor({ tabs: [a, b] });

      act(() => {
        view.result.current.reorderFiles([b, a]);
      });

      expect(store.get(editorAtom).tabs.map((tab) => tab.filename)).toEqual([
        'b.md',
        'a.md',
      ]);
    });
  });
});
