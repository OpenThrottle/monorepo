import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalLogging } from '../GlobalLogging';

describe('GlobalLogging Component', () => {
  test('renders logging placeholder heading', () => {
    const Component = () => <GlobalLogging />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalLogging')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'GlobalLogging' }),
    ).toBeInTheDocument();
  });
});
