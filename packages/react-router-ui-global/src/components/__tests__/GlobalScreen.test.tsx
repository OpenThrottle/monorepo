import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { describe, expect, test } from 'vitest';
import { GlobalScreen } from '../GlobalScreen';
import type { GlobalScreenProps } from '../GlobalScreen';

describe('GlobalScreen Component', () => {
  const setup = (props: GlobalScreenProps = {}): RenderResult => {
    const Component = () => (
      <GlobalScreen {...props}>
        <span>screen-child</span>
      </GlobalScreen>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    return render(<RoutesStub />);
  };

  test('renders children inside content wrapper', () => {
    const component = setup();

    expect(component.getByText('screen-child')).toBeInTheDocument();
  });

  test('renders beta banner when beta is true', () => {
    const component = setup({ beta: true });

    expect(component.getByText(/Beta:/i)).toBeInTheDocument();
    expect(component.getByRole('link', { name: /GitHub/i })).toHaveAttribute(
      'href',
      'https://github.com/OpenThrottle/monorepo/issues/new/choose',
    );
  });

  test('omits the beta banner by default', () => {
    const component = setup();

    expect(component.queryByText(/Beta:/i)).toBeNull();
    expect(component.queryByRole('link', { name: /GitHub/i })).toBeNull();
  });

  test('omits the beta banner when beta is explicitly false', () => {
    const component = setup({ beta: false });

    expect(component.queryByText(/Beta:/i)).toBeNull();
  });
});
