import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

    render(
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

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Open confirmation' }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Delete item');
    expect(dialog).toHaveTextContent('This cannot be undone. Continue?');

    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });
});
