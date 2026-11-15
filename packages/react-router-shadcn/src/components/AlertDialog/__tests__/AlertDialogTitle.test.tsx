import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '../index';

describe('AlertDialogTitle', () => {
  it('renders a heading with title styles and merged className', () => {
    const component = render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle className="title-extra">
            Important choice
          </AlertDialogTitle>
          <AlertDialogDescription>Choose carefully.</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    const heading = component.getByRole('heading', {
      name: 'Important choice',
    });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveClass('title-extra');
    expect(heading).toHaveClass('text-lg');
  });

  it('forwards ref to the title element', () => {
    const ref = React.createRef<HTMLHeadingElement>();

    const component = render(
      <AlertDialog defaultOpen={true}>
        <AlertDialogContent>
          <AlertDialogTitle ref={ref}>T</AlertDialogTitle>
          <AlertDialogDescription>D</AlertDialogDescription>
        </AlertDialogContent>
      </AlertDialog>,
    );

    expect(ref.current).toBe(component.getByRole('heading', { name: 'T' }));
  });
});
