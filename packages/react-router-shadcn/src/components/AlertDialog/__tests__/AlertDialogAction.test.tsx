import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogAction', () => {
  it('renders as a button with merged className and button variant styles', () => {
    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>Action test</AlertDialogTitle>
          <AlertDialogDescription>
            Description for action test.
          </AlertDialogDescription>
          <AlertDialogAction className="custom-action">
            Confirm
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const button = screen.getByRole('button', { name: 'Confirm' });

    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('custom-action');
    expect(button).toHaveClass('inline-flex');
  });

  it('forwards ref to the underlying button', () => {
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>Action test</AlertDialogTitle>
          <AlertDialogDescription>
            Description for action test.
          </AlertDialogDescription>
          <AlertDialogAction ref={ref}>OK</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(screen.getByRole('button', { name: 'OK' }));
  });
});
