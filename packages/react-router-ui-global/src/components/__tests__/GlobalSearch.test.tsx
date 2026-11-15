import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalSearch } from '../GlobalSearch';

describe('GlobalSearch Component', () => {
  test('renders search placeholder heading', () => {
    const Component = () => {
      return <GlobalSearch />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalSearch')).toBeInTheDocument();
    expect(
      component.getByRole('heading', { name: 'GlobalSearch' }),
    ).toBeInTheDocument();
  });
});
