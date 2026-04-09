import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogCancel', () => {
  it('renders as a button with outline variant, spacing, and merged className', () => {
    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel test</AlertDialogTitle>
          <AlertDialogDescription>
            Description for cancel test.
          </AlertDialogDescription>
          <AlertDialogCancel className="custom-cancel">
            Go back
          </AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const button = screen.getByRole('button', { name: 'Go back' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('custom-cancel');
    expect(button).toHaveClass('border-input');
    expect(button).toHaveClass('mt-2', 'sm:mt-0');
  });

  it('forwards ref to the underlying button', () => {
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>Cancel test</AlertDialogTitle>
          <AlertDialogDescription>
            Description for cancel test.
          </AlertDialogDescription>
          <AlertDialogCancel ref={ref}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(screen.getByRole('button', { name: 'Cancel' }));
  });
});
