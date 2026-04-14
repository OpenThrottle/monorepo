import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogContent', () => {
  it('renders the dialog panel with role alertdialog and merges className', () => {
    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent className="my-panel">
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogDescription>Panel description.</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveClass('my-panel');
    expect(dialog).toHaveClass('fixed', 'left-[50%]', 'top-[50%]', 'z-50');
    expect(dialog).toHaveTextContent('Title');
    expect(dialog).toHaveTextContent('Panel description.');
  });

  it('forwards ref to the content element', () => {
    const ref = React.createRef<HTMLDivElement>();

    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent ref={ref}>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogDescription>D</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(screen.getByRole('alertdialog'));
  });
});
