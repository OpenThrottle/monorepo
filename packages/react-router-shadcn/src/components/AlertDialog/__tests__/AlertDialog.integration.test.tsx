import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../index';

describe('AlertDialog (integration)', () => {
  it('opens from the trigger and exposes alertdialog semantics, copy, and actions', async () => {
    const user = userEvent.setup();

    const component = render(
      <AlertDialog>
        <AlertDialogTrigger>Open confirmation</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(component.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(
      component.getByRole('button', { name: 'Open confirmation' }),
    );

    const dialog = await component.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Delete item');
    expect(dialog).toHaveTextContent('This cannot be undone. Continue?');

    expect(
      component.getByRole('button', { name: 'Go back' }),
    ).toBeInTheDocument();
    expect(
      component.getByRole('button', { name: 'Delete' }),
    ).toBeInTheDocument();
  });
});
