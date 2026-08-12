import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorAtom, EditorFile } from '../../data/atom.editor';
import { EditorSidebar } from '../EditorSidebar';
import type { EditorSidebarProps } from '../EditorSidebar';

const file = (overrides: Partial<EditorFile> = {}): EditorFile => ({
  directory: '.',
  filename: 'readme.md',
  language: 'markdown',
  ...overrides,
});

const renderSidebar = (
  initial: Partial<EditorAtom> = {},
  props: EditorSidebarProps = {},
): RenderResult => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, ...initial });

  const Component = (): React.ReactElement => (
    <Provider store={store}>
      <EditorSidebar {...props} />
    </Provider>
  );

  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return render(<RoutesStub />);
};

describe('EditorSidebar Component', () => {
  test('renders a placeholder when there are no files', () => {
    const component = renderSidebar();

    expect(component.getByTestId('EditorSidebar')).not.toBeNull();
    expect(component.getByText('No files found')).not.toBeNull();
  });

  test('renders an entry for every filtered file', () => {
    const component = renderSidebar({
      files: [file({ filename: 'a.md' }), file({ filename: 'b.ts' })],
    });

    expect(component.getAllByTestId('EditorSidebarFile')).toHaveLength(2);
    expect(component.getByText('a.md')).not.toBeNull();
    expect(component.getByText('b.ts')).not.toBeNull();
  });

  test('only shows files matching the search query', () => {
    const component = renderSidebar({
      files: [file({ filename: 'a.md' }), file({ filename: 'b.ts' })],
      searchQuery: 'a.md',
    });

    expect(component.getAllByTestId('EditorSidebarFile')).toHaveLength(1);
    expect(component.getByText('a.md')).not.toBeNull();
  });

  test('only shows files matching the selected type', () => {
    const component = renderSidebar({
      files: [
        file({ filename: 'agent.md', promptType: 'agents' }),
        file({ filename: 'prompt.md', promptType: 'prompts' }),
      ],
      selectedType: 'agents',
    });

    expect(component.getAllByTestId('EditorSidebarFile')).toHaveLength(1);
    expect(component.getByText('agent.md')).not.toBeNull();
  });
});
