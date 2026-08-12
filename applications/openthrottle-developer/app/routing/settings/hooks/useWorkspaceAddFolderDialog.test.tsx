import * as React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { useWorkspaceAddFolderDialog } from './useWorkspaceAddFolderDialog';
import type { UseWorkspaceAddFolderDialogResult } from './useWorkspaceAddFolderDialog';

function renderDialog(): {
  component: RenderResult;
  value: { current: UseWorkspaceAddFolderDialogResult | null };
} {
  const value: { current: UseWorkspaceAddFolderDialogResult | null } = {
    current: null,
  };
  function DialogProbe(): React.ReactElement {
    const hook = useWorkspaceAddFolderDialog();
    value.current = hook;
    return (
      <form data-testid="browse-form" onSubmit={hook.handleBrowseSubmit}>
        <input defaultValue="" name="path" />
      </form>
    );
  }
  const Stub = createRoutesStub([
    { Component: DialogProbe, action: () => null, path: '/' },
  ]);
  const component = render(<Stub />);
  return { component, value };
}

describe('useWorkspaceAddFolderDialog', () => {
  let component: RenderResult;
  let value: { current: UseWorkspaceAddFolderDialogResult | null };

  beforeEach(() => {
    ({ component, value } = renderDialog());
  });

  test('starts closed with no browse results and manual path hidden', () => {
    expect(value.current?.open).toBe(false);
    expect(value.current?.showManualPath).toBe(false);
    expect(value.current?.browseEntries).toBeNull();
    expect(value.current?.browsePath).toBeNull();
    expect(value.current?.isAdding).toBe(false);
  });

  test('setOpen toggles the dialog open state', () => {
    act(() => value.current?.setOpen(true));
    expect(value.current?.open).toBe(true);

    act(() => value.current?.setOpen(false));
    expect(value.current?.open).toBe(false);
  });

  test('handleToggleManualPath flips the manual-path flag', () => {
    act(() => value.current?.handleToggleManualPath());
    expect(value.current?.showManualPath).toBe(true);

    act(() => value.current?.handleToggleManualPath());
    expect(value.current?.showManualPath).toBe(false);
  });

  test('handleBrowseSubmit submits the trimmed path from the form', () => {
    const input = component.container.querySelector('input[name="path"]');
    if (input == null) {
      throw new Error('expected the path input to be rendered');
    }
    fireEvent.change(input, { target: { value: '  /repo  ' } });

    act(() => {
      fireEvent.submit(component.getByTestId('browse-form'));
    });

    expect(value.current?.browseFetcher.formData?.get('path')).toBe('/repo');
    expect(value.current?.browseFetcher.formData?.get('intent')).toBe(
      'browseDirectory',
    );
  });

  test('handleBrowseSubmit ignores a blank path', () => {
    const input = component.container.querySelector('input[name="path"]');
    if (input == null) {
      throw new Error('expected the path input to be rendered');
    }
    fireEvent.change(input, { target: { value: '   ' } });

    act(() => {
      fireEvent.submit(component.getByTestId('browse-form'));
    });

    expect(value.current?.browseFetcher.formData).toBeUndefined();
  });
});
