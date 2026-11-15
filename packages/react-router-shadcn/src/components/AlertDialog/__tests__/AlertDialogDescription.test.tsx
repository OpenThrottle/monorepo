import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogDescription', () => {
  it('renders body copy with muted styles and merged className', () => {
    const component = render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>Heading</AlertDialogTitle>
          <AlertDialogDescription className="desc-extra">
            Supporting details for the alert.
          </AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const description = component.getByText(
      'Supporting details for the alert.',
    );
    expect(description).toBeInTheDocument();
    expect(description).toHaveClass('desc-extra');
    expect(description).toHaveClass('text-sm', 'text-muted-foreground');
  });

  it('forwards ref to the description element', () => {
    const ref = React.createRef<HTMLParagraphElement>();

    const component = render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle>T</AlertDialogTitle>
          <AlertDialogDescription ref={ref}>D</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(component.getByText('D'));
  });
});
