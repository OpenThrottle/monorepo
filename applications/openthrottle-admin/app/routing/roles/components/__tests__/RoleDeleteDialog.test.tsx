import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { createRoutesStub, useFetcher } from 'react-router';
import { describe, expect, test } from 'vitest';

import type { action as roleDetailAction } from '~/routes/roles.$roleId';

import { RoleDeleteDialog } from '../RoleDeleteDialog';

const renderDialog = (): RenderResult => {
  const Harness = () => {
    const fetcher = useFetcher<typeof roleDetailAction>();
    return <RoleDeleteDialog fetcher={fetcher} />;
  };

  const RoutesStub = createRoutesStub([{ Component: Harness, path: '/' }]);

  return render(<RoutesStub />);
};

describe('RoleDeleteDialog Component', () => {
  test('opens the confirmation dialog with the delete warning when triggered', async () => {
    const user = userEvent.setup();
    const component = renderDialog();

    await user.click(component.getByRole('button', { name: 'Delete role' }));

    expect(
      await component.findByRole('heading', { name: 'Delete role' }),
    ).toBeInTheDocument();
    expect(
      component.getByText(/permanently delete this role/i),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });

  // Regression guard (OT b68853fb). `AlertDialogAction` is a `Dialog.Close`, so
  // confirming unmounts `AlertDialogContent` within the same click. A form
  // rendered inside it is detached before the browser submits, and the delete
  // silently never happens — so the confirm must not depend on one.
  test('confirming does not depend on a form inside the dialog', async () => {
    const user = userEvent.setup();
    const component = renderDialog();

    await user.click(component.getByRole('button', { name: 'Delete role' }));

    const dialog = await component.findByRole('alertdialog');

    expect(dialog.querySelector('form')).toBeNull();
  });
});
