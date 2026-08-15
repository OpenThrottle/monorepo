import * as React from 'react';
import { act, render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { useAddFolderDialog } from '../useAddFolderDialog';
import type {
  UseAddFolderDialogResult,
  AddFolderDialogOptions,
} from '../useAddFolderDialog';

const options: AddFolderDialogOptions = {
  canUseNativeDialog: false,
  defaultBrowsePath: '/Users/dev/Development',
  roots: ['/Users/dev/Development'],
};

function renderDialog(): {
  component: RenderResult;
  value: { current: UseAddFolderDialogResult | null };
} {
  const value: { current: UseAddFolderDialogResult | null } = {
    current: null,
  };
  function DialogProbe(): React.ReactElement {
    const hook = useAddFolderDialog(options);
    value.current = hook;
    return <div data-testid="dialog-probe" />;
  }
  const Stub = createRoutesStub([
    { Component: DialogProbe, action: () => null, path: '/' },
  ]);
  const component = render(<Stub />);
  return { component, value };
}

describe('useAddFolderDialog', () => {
  let value: { current: UseAddFolderDialogResult | null };

  beforeEach(() => {
    ({ value } = renderDialog());
  });

  test('starts closed with no listing and manual path hidden', () => {
    expect(value.current?.open).toBe(false);
    expect(value.current?.showManualPath).toBe(false);
    expect(value.current?.hasListing).toBe(false);
    expect(value.current?.currentPath).toBeNull();
    expect(value.current?.entries).toEqual([]);
    expect(value.current?.isAdding).toBe(false);
  });

  test('surfaces the native-dialog capability from options', () => {
    expect(value.current?.canUseNativeDialog).toBe(false);
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
});
