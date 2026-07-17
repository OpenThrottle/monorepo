import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalScreen } from '../GlobalScreen';

describe('GlobalScreen Component', () => {
  test('renders children inside content wrapper', () => {
    const Component = () => (
      <GlobalScreen>
        <span>screen-child</span>
      </GlobalScreen>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('screen-child')).toBeInTheDocument();
  });

  test('renders beta banner when beta is true', () => {
    // eslint-disable-next-line react/no-multi-comp -- test-local wrapper component
    const Component = () => (
      <GlobalScreen beta={true}>
        <span>screen-child</span>
      </GlobalScreen>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText(/Beta:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/openthrottle/openthrottle/issues',
    );
  });
});
