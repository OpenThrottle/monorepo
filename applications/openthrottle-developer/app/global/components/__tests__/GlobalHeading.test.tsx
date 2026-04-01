import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalHeading } from '../GlobalHeading';

describe('GlobalHeading Component', () => {
  test('should render the heading text in a level-one heading', () => {
    const Component = () => <GlobalHeading heading="A test heading" />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalHeading')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 1, name: 'A test heading' }),
    ).toBeInTheDocument();
  });
});
