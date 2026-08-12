import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorAtom } from '../../data/atom.editor';
import { EditorSidebarFile } from '../EditorSidebarFile';
import type { EditorSidebarFileProps } from '../EditorSidebarFile';

const renderSidebarFile = (
  initial: Partial<EditorAtom> = {},
  props: EditorSidebarFileProps,
): { component: RenderResult; store: ReturnType<typeof createStore> } => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, ...initial });

  const Component = (): React.ReactElement => (
    <Provider store={store}>
      <EditorSidebarFile {...props} />
    </Provider>
  );

  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return { component: render(<RoutesStub />), store };
};

describe('EditorSidebarFile Component', () => {
  test('renders only the final path segment as the label', () => {
    const { component } = renderSidebarFile(
      {},
      { filename: 'skills/agents/agents.md' },
    );

    expect(component.getByText('agents.md')).not.toBeNull();
  });

  test('marks the active file with the active background class', () => {
    const { component } = renderSidebarFile(
      { filename: 'a.md' },
      { filename: 'a.md' },
    );

    expect(component.getByTestId('EditorSidebarFile').className).toContain(
      'bg-white/15',
    );
  });

  test('does not mark an inactive file as active', () => {
    const { component } = renderSidebarFile(
      { filename: 'a.md' },
      { filename: 'b.md' },
    );

    expect(component.getByTestId('EditorSidebarFile').className).not.toContain(
      'bg-white/15',
    );
  });

  test('dims hidden (dotfile) entries', () => {
    const { component } = renderSidebarFile({}, { filename: '.env' });

    expect(component.getByTestId('EditorSidebarFile').className).toContain(
      'text-gray-500',
    );
  });

  test('clicking a file opens it and activates the tab', async () => {
    const { component, store } = renderSidebarFile(
      {},
      { filename: 'a.md', id: '1' },
    );

    const user = userEvent.setup();
    await user.click(component.getByTestId('EditorSidebarFile'));

    const state = store.get(editorAtom);
    expect(state.filename).toBe('a.md');
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0]?.filename).toBe('a.md');
  });

  test('pressing Enter opens the file via keyboard', async () => {
    const { component, store } = renderSidebarFile({}, { filename: 'a.md' });

    const user = userEvent.setup();
    component.getByTestId('EditorSidebarFile').focus();
    await user.keyboard('{Enter}');

    expect(store.get(editorAtom).filename).toBe('a.md');
  });
});
