import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { PersonasToolbar } from '../PersonasToolbar';

describe('PersonasToolbar Component', () => {
  test('renders toolbar region and heading', () => {
    const Component = () => {
      return <PersonasToolbar />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('PersonasToolbar')).toBeInTheDocument();
    expect(component.getByText(/read from/i)).toBeInTheDocument();
    expect(component.getByText(/no in-app writes/i)).toBeInTheDocument();
  });
});
