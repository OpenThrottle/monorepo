import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalHeader } from '../GlobalHeader';

describe('GlobalHeader Component', () => {
  test('renders nothing while header is disabled', () => {
    const Component = () => <GlobalHeader />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    render(<RoutesStub />);

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
