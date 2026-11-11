import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { LayoutGrid } from '../LayoutGrid';

describe('LayoutGrid', () => {
  test('renders its children on a grid with the caller classes', () => {
    const component = render(
      <LayoutGrid className="grid-cols-3">
        <p>cell</p>
      </LayoutGrid>,
    );

    expect(component.getByTestId('LayoutGrid')).toHaveClass(
      'grid',
      'grid-cols-3',
    );
    expect(component.getByText('cell')).toBeInTheDocument();
  });
});
