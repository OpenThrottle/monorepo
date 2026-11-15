import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import LogsRoute from '../settings.logs';

describe('routes/settings.logs.tsx', () => {
  test('renders logs panel', () => {
    const RoutesStub = createRoutesStub([{ Component: LogsRoute, path: '/' }]);

    const component = render(<RoutesStub />);

    expect(component.getByText(/Client console sink/i)).toBeInTheDocument();
  });
});
