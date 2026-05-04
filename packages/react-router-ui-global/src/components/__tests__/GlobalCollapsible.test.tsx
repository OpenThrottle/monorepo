import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { GlobalCollapsible } from '../GlobalCollapsible';
import type { GlobalCollapsibleProps } from '../GlobalCollapsible';

describe('GlobalCollapsible Component', () => {
  let component: RenderResult;
  let props: GlobalCollapsibleProps;

  beforeEach(() => {
    props = {};

    const Component = () => <GlobalCollapsible {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
