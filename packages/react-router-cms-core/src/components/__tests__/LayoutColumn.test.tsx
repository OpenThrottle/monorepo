import { render } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, test } from 'vitest';

import { LayoutColumn } from '../LayoutColumn';

describe('LayoutColumn', () => {
  test('renders its children inside the caller classes', () => {
    const component = render(
      <LayoutColumn className="flex flex-col">
        <p>first</p>
      </LayoutColumn>,
    );

    expect(component.getByTestId('LayoutColumn')).toHaveClass('flex-col');
    expect(component.getByText('first')).toBeInTheDocument();
  });
});
