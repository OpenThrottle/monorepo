import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorAtom } from '../../data/atom.editor';
import { EditorToolbar } from '../EditorToolbar';
import type { EditorToolbarProps } from '../EditorToolbar';

// jsdom does not implement the Pointer Capture API; Radix Select calls it
// when opening, so userEvent interactions throw without this guard. This
// package has no shared vitest setup file (see `vitest.config.ts`), so the
// shim is scoped to this file, mirroring the one other packages register
// globally in their own `vitest.setup.ts`.
if (typeof Element !== 'undefined') {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = (): boolean => false;
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = (): void => {};
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = (): void => {};
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = (): void => {};
  }
}

const renderToolbar = (
  props: EditorToolbarProps = {},
  initial: Partial<EditorAtom> = {},
): { component: RenderResult; store: ReturnType<typeof createStore> } => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, ...initial });

  const Component = (): React.ReactElement => (
    <Provider store={store}>
      <EditorToolbar {...props} />
    </Provider>
  );

  const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

  return { component: render(<RoutesStub />), store };
};

describe('EditorToolbar Component', () => {
  test('renders the title, search input, and new-file button', () => {
    const { component } = renderToolbar({ title: 'My Prompts' });

    expect(component.getByTestId('EditorToolbar')).not.toBeNull();
    expect(component.getByText('My Prompts')).not.toBeNull();
    expect(component.getByPlaceholderText('Search prompts...')).not.toBeNull();
    expect(
      component.getByRole('button', { name: /New Prompt/i }),
    ).not.toBeNull();
  });

  test('typing in the search box updates the shared search query', async () => {
    const { component, store } = renderToolbar();

    const user = userEvent.setup();
    await user.type(
      component.getByPlaceholderText('Search prompts...'),
      'read',
    );

    expect(store.get(editorAtom).searchQuery).toBe('read');
  });

  test('clicking New Prompt reveals the create-file form', async () => {
    const { component } = renderToolbar();

    expect(component.queryByTestId('EditorNewFileForm')).toBeNull();

    const user = userEvent.setup();
    await user.click(component.getByRole('button', { name: /New Prompt/i }));

    expect(component.getByTestId('EditorNewFileForm')).not.toBeNull();
  });

  test('Escape hides the create-file form once it is open', async () => {
    const { component } = renderToolbar();

    const user = userEvent.setup();
    await user.click(component.getByRole('button', { name: /New Prompt/i }));
    expect(component.getByTestId('EditorNewFileForm')).not.toBeNull();

    await user.keyboard('{Escape}');

    expect(component.queryByTestId('EditorNewFileForm')).toBeNull();
  });

  test('Ctrl+N inside the toolbar opens the create-file form', async () => {
    const { component } = renderToolbar();

    const user = userEvent.setup();
    component.getByPlaceholderText('Search prompts...').focus();
    await user.keyboard('{Control>}n{/Control}');

    expect(component.getByTestId('EditorNewFileForm')).not.toBeNull();
  });

  test('choosing a type filter updates the shared selected type', async () => {
    const { component, store } = renderToolbar();

    const user = userEvent.setup();
    await user.click(component.getByRole('combobox'));
    await user.click(component.getByRole('option', { name: 'Skills' }));

    expect(store.get(editorAtom).selectedType).toBe('skills');
  });
});
