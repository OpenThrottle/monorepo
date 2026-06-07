import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalHeading } from '../GlobalHeading';

describe('GlobalHeading Component', () => {
  test('renders title in heading element', () => {
    const Component = () => <GlobalHeading title="Page title" />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByTestId('GlobalHeading')).toHaveTextContent('Page title');
  });
});
