import type { RenderResult } from '@testing-library/react';
import { fireEvent, render } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { EditorFile } from '../../data/atom.editor';
import { editorAtom, editorAtomDefaults } from '../../data/atom.editor';
import type { EditorTabsProps } from '../EditorTabs';
import { EditorTabs } from '../EditorTabs';

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

const renderTabs = (
  tabs: readonly EditorFile[],
  props: EditorTabsProps = {},
  initialEntries: readonly string[] = ['/prompts'],
): { component: RenderResult; store: ReturnType<typeof createStore> } => {
  const store = createStore();
  store.set(editorAtom, { ...editorAtomDefaults, tabs });

  const Component = (): React.ReactElement | null => (
    <Provider store={store}>
      <EditorTabs {...props} />
    </Provider>
  );

  const RoutesStub = createRoutesStub([{ Component, path: '/prompts/*' }]);

  return {
    component: render(<RoutesStub initialEntries={[...initialEntries]} />),
    store,
  };
};

describe('EditorTabs Component', () => {
  test('renders nothing when there are no open tabs', () => {
    const { component } = renderTabs([]);

    expect(component.queryByTestId('EditorTabs')).toBeNull();
  });

  test('renders one EditorTab per open tab, in order', () => {
    const { component } = renderTabs([
      file({ filename: 'a.md' }),
      file({ filename: 'b.md' }),
    ]);

    const tabs = component.getAllByTestId('EditorTab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]?.textContent).toContain('a.md');
    expect(tabs[1]?.textContent).toContain('b.md');
  });

  test('dragging a tab onto another reorders the shared tab state', () => {
    const { component, store } = renderTabs([
      file({ filename: 'a.md' }),
      file({ filename: 'b.md' }),
      file({ filename: 'c.md' }),
    ]);

    const tabs = component.getAllByTestId('EditorTab');
    const source = tabs[0];
    const target = tabs[2];

    if (!source || !target) {
      throw new Error('expected three rendered tabs');
    }

    const dataTransfer = createDataTransfer();
    fireEvent.dragStart(source, { dataTransfer });
    fireEvent.dragOver(target, { dataTransfer });
    fireEvent.drop(target, { dataTransfer });

    expect(store.get(editorAtom).tabs.map((tab) => tab.filename)).toEqual([
      'b.md',
      'c.md',
      'a.md',
    ]);
  });
});
