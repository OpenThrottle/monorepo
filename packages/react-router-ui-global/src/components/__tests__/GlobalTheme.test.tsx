import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalTheme } from '../GlobalTheme';

describe('GlobalTheme Component', () => {
  test('renders theme placeholder heading', () => {
    const Component = () => {
      return <GlobalTheme />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalTheme')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'GlobalTheme' }),
    ).toBeInTheDocument();
  });
});
