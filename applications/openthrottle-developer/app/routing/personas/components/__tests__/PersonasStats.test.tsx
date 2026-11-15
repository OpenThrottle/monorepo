import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PersonasStats } from '../PersonasStats';

describe('PersonasStats Component', () => {
  test('renders stats region', () => {
    const Component = () => {
      return <PersonasStats />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('PersonasStats')).toBeInTheDocument();
  });
});
