import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertDialog as AlertDialogPrimitive } from 'radix-ui';
import { describe, expect, it } from 'vitest';
import {
  AlertDialog,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogOverlay', () => {
  it('renders a full-screen backdrop with merged className and forwards ref', () => {
    const ref = React.createRef<HTMLDivElement>();

    render(
      <AlertDialog open={true}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="overlay-extra" ref={ref} />
          <AlertDialogPrimitive.Content>
            <AlertDialogTitle>Inside</AlertDialogTitle>
            <AlertDialogDescription>
              Overlay test description.
            </AlertDialogDescription>
          </AlertDialogPrimitive.Content>
        </AlertDialogPortal>
      </AlertDialog>,
    );

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Inside');
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current?.getAttribute('data-state')).toBe('open');
    expect(ref.current).toHaveClass('overlay-extra');
    expect(ref.current).toHaveClass('fixed', 'inset-0', 'z-50');
  });
});
