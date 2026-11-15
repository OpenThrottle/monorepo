import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';

import { GlobalHeading } from '../GlobalHeading';

describe('GlobalHeading Component', () => {
  test('renders title in heading element', () => {
    const Component = () => {
      return <GlobalHeading title="Page title" />;
    };
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);
    const component = render(<RoutesStub />);

    expect(component.getByTestId('GlobalHeading')).toHaveTextContent(
      'Page title',
    );
  });
});
