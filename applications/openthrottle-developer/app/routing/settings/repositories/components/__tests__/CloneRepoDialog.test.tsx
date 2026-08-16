import * as React from 'react';
import { render, waitFor, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRoutesStub, Form, useActionData } from 'react-router';
import { describe, expect, test } from 'vitest';
import { CloneRepoDialog } from '../CloneRepoDialog';

/**
 * The one probe component (react/no-multi-comp): threads the route's action
 * `error` into the dialog via `actionError` — mirroring how the route surfaces a
 * failed clone — and renders a sibling `addFolder` submit so tests can prove a
 * failed add cannot hold the clone dialog open.
 */
function DialogProbe(): React.ReactElement {
  const actionData = useActionData<{ error?: string } | null>();
  return (
    <>
      <CloneRepoDialog actionError={actionData?.error ?? null} />
      <Form method="post">
        <input name="intent" type="hidden" value="addFolder" />
        <button type="submit">add folder</button>
      </Form>
    </>
  );
}

/**
 * Stubs the route action the way the real one behaves: `addFolder` always fails,
 * `cloneRepo` returns `cloneResult` — so each submission replaces actionData.
 */
const renderDialog = (cloneResult: unknown): RenderResult => {
  const RoutesStub = createRoutesStub([
    {
      Component: DialogProbe,
      action: async ({ request }) => {
        const formData = await request.formData();
        return formData.get('intent') === 'addFolder'
          ? { error: 'Add failed' }
          : cloneResult;
      },
      path: '/',
    },
  ]);
  return render(<RoutesStub />);
};

/** Fills the open dialog's git URL and submits it — scoped to the dialog so the
 * submit button is never confused with the identically-labelled trigger. */
const submitClone = async (
  user: ReturnType<typeof userEvent.setup>,
  component: RenderResult,
): Promise<void> => {
  const dialog = await component.findByTestId('CloneRepoDialog');
  await user.type(
    within(dialog).getByLabelText('Git URL'),
    'git@github.com:owner/repo.git',
  );
  await user.click(within(dialog).getByRole('button', { name: 'Clone repo' }));
};

describe('CloneRepoDialog Component', () => {
  test('renders the clone trigger', () => {
    const component = renderDialog(null);

    expect(component.getByTestId('CloneRepoDialogTrigger')).toHaveTextContent(
      'Clone repo',
    );
  });

  test('opens the dialog with a git URL field and the cloneRepo intent', async () => {
    const user = userEvent.setup();
    const component = renderDialog(null);

    await user.click(component.getByTestId('CloneRepoDialogTrigger'));

    const dialog = await component.findByTestId('CloneRepoDialog');
    expect(dialog).toBeInTheDocument();
    expect(component.getByLabelText('Git URL')).toBeInTheDocument();
    expect(dialog.querySelector('input[name="intent"]')).toHaveValue(
      'cloneRepo',
    );
  });

  test('closes after a successful clone', async () => {
    const user = userEvent.setup();
    const component = renderDialog(null);

    await user.click(component.getByTestId('CloneRepoDialogTrigger'));
    await submitClone(user, component);

    await waitFor(() => {
      expect(
        component.queryByTestId('CloneRepoDialog'),
      ).not.toBeInTheDocument();
    });
  });

  test('stays open and shows the error when the clone fails', async () => {
    const user = userEvent.setup();
    const component = renderDialog({ error: 'Clone failed' });

    await user.click(component.getByTestId('CloneRepoDialogTrigger'));
    await submitClone(user, component);

    expect(await component.findByRole('alert')).toHaveTextContent(
      'Clone failed',
    );
    expect(component.getByTestId('CloneRepoDialog')).toBeInTheDocument();
  });

  test('an add-folder failure does not hold the dialog open', async () => {
    const user = userEvent.setup();
    const component = renderDialog(null);

    // A failed add-folder leaves actionError set on the route…
    await user.click(component.getByRole('button', { name: 'add folder' }));

    // …but the successful clone's own actionData replaces it, so the clone
    // dialog still closes.
    await user.click(component.getByTestId('CloneRepoDialogTrigger'));
    await submitClone(user, component);

    await waitFor(() => {
      expect(
        component.queryByTestId('CloneRepoDialog'),
      ).not.toBeInTheDocument();
    });
  });
});
