import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalFooter } from '../GlobalFooter';
import type { GlobalFooterProps } from '../GlobalFooter';

describe('GlobalFooter Component', () => {
  let component: RenderResult;
  let props: GlobalFooterProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalFooter {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders footer copy and test id', () => {
    expect(component.getByTestId('GlobalFooter')).toBeInTheDocument();
    expect(
      component.getByText('Built by engineers. Open source. No lock-in.'),
    ).toBeInTheDocument();
  });
});
