import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalProviders } from '../GlobalProviders';

describe('GlobalProviders Component', () => {
  test('renders child content within providers', () => {
    const Component = () => (
      <GlobalProviders>
        <span>provider-child</span>
      </GlobalProviders>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.getByText('provider-child')).toBeInTheDocument();
  });
});
