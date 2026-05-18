import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogTitle', () => {
  it('renders a heading with title styles and merged className', () => {
    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle className="title-extra">
            Important choice
          </AlertDialogTitle>
          <AlertDialogDescription>Choose carefully.</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const heading = screen.getByRole('heading', { name: 'Important choice' });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('title-extra');
    expect(heading).toHaveClass('text-lg');
  });

  it('forwards ref to the title element', () => {
    const ref = React.createRef<HTMLHeadingElement>();

    render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle ref={ref}>T</AlertDialogTitle>
          <AlertDialogDescription>D</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(screen.getByRole('heading', { name: 'T' }));
  });
});
