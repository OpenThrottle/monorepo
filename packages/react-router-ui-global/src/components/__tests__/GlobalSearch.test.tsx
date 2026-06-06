import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalSearch } from '../GlobalSearch';

describe('GlobalSearch Component', () => {
  test('renders search placeholder heading', () => {
    const Component = () => <GlobalSearch />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalSearch')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'GlobalSearch' }),
    ).toBeInTheDocument();
  });
});
