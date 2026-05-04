import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import LogsRoute from '../settings.logs';

describe('routes/settings.logs.tsx', () => {
  test('renders logs panel', () => {
    const RoutesStub = createRoutesStub([{ Component: LogsRoute, path: '/' }]);

    render(<RoutesStub />);

    expect(screen.getByText(/Client console sink/i)).toBeInTheDocument();
  });
});
