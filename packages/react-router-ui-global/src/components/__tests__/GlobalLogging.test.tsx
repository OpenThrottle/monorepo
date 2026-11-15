import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalLogging } from '../GlobalLogging';

describe('GlobalLogging Component', () => {
  test('renders logging placeholder heading', () => {
    const Component = () => {
      return <GlobalLogging />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalLogging')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'GlobalLogging' }),
    ).toBeInTheDocument();
  });
});
