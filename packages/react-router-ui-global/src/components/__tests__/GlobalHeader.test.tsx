import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalHeader } from '../GlobalHeader';

describe('GlobalHeader Component', () => {
  test('renders nothing while header is disabled', () => {
    const Component = () => {
      return <GlobalHeader />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
