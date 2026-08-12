import * as React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { createRoutesStub } from 'react-router';
import { describe, expect, test, vi } from 'vitest';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorFile } from '../../data/atom.editor';
import { EditorTab } from '../EditorTab';
import type { EditorTabProps } from '../EditorTab';

const file = (overrides: Partial<EditorFile> = {}): EditorFile => ({
  directory: '.',
  filename: 'a.md',
  language: 'markdown',
  ...overrides,
});

interface FakeDataTransfer {
  readonly dropEffect: string;
  readonly effectAllowed: string;
  readonly getData: (format: string) => string;
  readonly setData: (format: string, value: string) => void;
}

/**
 * @description Minimal `DataTransfer` stand-in. jsdom does not implement
 * `DataTransfer`, so drag events need a plain object supporting the
 * `setData`/`getData` pair the component actually calls. `fireEvent`'s event
 * options are untyped, so this can be handed to it directly without a cast.
 */
const createDataTransfer = (): FakeDataTransfer => {
  const data = new Map<string, string>();

  return {
    dropEffect: 'none',
    effectAllowed: 'uninitialized',
    getData: (format: string): string => data.get(format) ?? '',
    setData: (format: string, value: string): void => {
      data.set(format, value);
    },
  };
};

const renderTab = (
  props: Partial<EditorTabProps> = {},
  options: {
    initialEntries?: readonly string[];
    tabs?: readonly EditorFile[];
  } = {},
): { component: RenderResult; store: ReturnType<typeof createStore> } => {
  const { initialEntries = ['/prompts/a.md'], tabs = [file()] } = options;
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, tabs });

  const defaultProps: EditorTabProps = {
    filename: 'a.md',
    onReorder: vi.fn(),
    ...props,
  };

  const Component = (): React.ReactElement => (
    <Provider store={store}>
      <EditorTab {...defaultProps} />
    </Provider>
  );

  const RoutesStub = createRoutesStub([{ Component, path: '/prompts/*' }]);

  return {
    component: render(<RoutesStub initialEntries={[...initialEntries]} />),
    store,
  };
};

describe('EditorTab Component', () => {
  test('links to the encoded file path under the base path', () => {
    const { component } = renderTab(
      { filename: 'a b.md' },
      { tabs: [file({ filename: 'a b.md' })] },
    );

    const link = component.getByTestId('EditorTab');
    expect(link.getAttribute('href')).toBe('/prompts/a%20b.md');
    expect(link.textContent).toContain('a b.md');
  });

  test('marks the tab active when it matches the current route', () => {
    const { component } = renderTab(
      { filename: 'a.md' },
      { initialEntries: ['/prompts/a.md'] },
    );

    expect(component.getByTestId('EditorTab').className).toContain(
      'bg-gray-100/20',
    );
  });

  test('does not mark the tab active for a different route', () => {
    const { component } = renderTab(
      { filename: 'a.md' },
      { initialEntries: ['/prompts/b.md'] },
    );

    expect(component.getByTestId('EditorTab').className).not.toContain(
      'bg-gray-100/20',
    );
  });

  test('closing the tab removes it from the shared editor state', async () => {
    const { component, store } = renderTab(
      { filename: 'a.md' },
      { initialEntries: ['/prompts/a.md'], tabs: [file({ filename: 'a.md' })] },
    );

    const user = userEvent.setup();
    await user.click(
      within(component.getByTestId('EditorTab')).getByRole('button'),
    );

    expect(store.get(editorAtom).tabs).toHaveLength(0);
  });

  test('dropping a dragged tab onto this tab calls onReorder', () => {
    const onReorder = vi.fn();
    const { component } = renderTab({ filename: 'b.md', onReorder });

    const target = component.getByTestId('EditorTab');
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(target, { dataTransfer });
    dataTransfer.setData('text/plain', 'a.md');
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onReorder).toHaveBeenCalledWith('a.md', 'b.md');
  });

  test('dropping the tab onto itself does not call onReorder', () => {
    const onReorder = vi.fn();
    const { component } = renderTab({ filename: 'a.md', onReorder });

    const target = component.getByTestId('EditorTab');
    const dataTransfer = createDataTransfer();
    dataTransfer.setData('text/plain', 'a.md');

    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(onReorder).not.toHaveBeenCalled();
  });
});
