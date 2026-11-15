import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';

import { AlertDialogHeader } from '../AlertDialogHeader';

describe('AlertDialogHeader', () => {
  it('renders a flex column with typography alignment classes and merged className', () => {
    const component = render(
      <AlertDialogHeader className="header-extra">
        <span>Header content</span>
      </AlertDialogHeader>,
    );

    const header = component.container.firstElementChild;
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('header-extra');
    expect(header).toHaveClass(
      'flex',
      'flex-col',
      'space-y-2',
      'text-center',
      'sm:text-left',
    );
    expect(component.getByText('Header content')).toBeInTheDocument();
  });
});
