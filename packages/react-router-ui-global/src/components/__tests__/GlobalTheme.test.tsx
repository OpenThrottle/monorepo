import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalTheme } from '../GlobalTheme';

describe('GlobalTheme Component', () => {
  test('renders theme placeholder heading', () => {
    const Component = () => <GlobalTheme />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalTheme')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'GlobalTheme' }),
    ).toBeInTheDocument();
  });
});
