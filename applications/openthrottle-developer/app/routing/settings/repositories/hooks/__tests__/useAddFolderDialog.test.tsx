import * as React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, Form, useActionData } from 'react-router';
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

// A shared ref cell the single probe component writes the live hook result to,
// so tests can drive/read the hook from outside the tree.
const value: { current: UseAddFolderDialogResult | null } = { current: null };

/**
 * The one probe component (react/no-multi-comp): threads the route's action
 * `error` into the hook via `actionError` — mirroring how the route surfaces a
 * failed add — and renders an `addFolder` submit so tests can trigger the
 * navigation edge the close-on-success effect keys off of.
 */
function DialogProbe(): React.ReactElement {
  const actionData = useActionData<{ error?: string } | null>();
  const hook = useAddFolderDialog({
    ...options,
    actionError: actionData?.error ?? null,
  });
  value.current = hook;
  return (
    <Form method="post">
      <input name="intent" type="hidden" value="addFolder" />
      <button type="submit">add</button>
    </Form>
  );
}

function renderDialog(action: () => unknown = () => null): RenderResult {
  value.current = null;
  const Stub = createRoutesStub([
    { Component: DialogProbe, action, path: '/' },
  ]);
  return render(<Stub />);
}

describe('useAddFolderDialog', () => {
  beforeEach(() => {
    renderDialog();
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

describe('useAddFolderDialog close-on-success', () => {
  test('closes the dialog on a successful add', async () => {
    const user = userEvent.setup();
    const component = renderDialog(() => null);

    act(() => value.current?.setOpen(true));
    expect(value.current?.open).toBe(true);

    await user.click(component.getByRole('button', { name: 'add' }));

    await waitFor(() => expect(value.current?.open).toBe(false));
  });

  test('keeps the dialog open when the add fails', async () => {
    const user = userEvent.setup();
    const component = renderDialog(() => ({
      error: 'That folder is already registered.',
    }));

    act(() => value.current?.setOpen(true));
    expect(value.current?.open).toBe(true);

    await user.click(component.getByRole('button', { name: 'add' }));

    // Let the submission settle back to idle, then assert it stayed open.
    await waitFor(() => expect(value.current?.isAdding).toBe(false));
    expect(value.current?.open).toBe(true);
  });
});
