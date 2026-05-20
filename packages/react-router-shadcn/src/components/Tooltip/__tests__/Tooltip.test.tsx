import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Tooltip } from '../Tooltip';
import type { TooltipProps } from '../Tooltip';

describe('Tooltip Component', () => {
  let component: RenderResult;
  let props: TooltipProps;

  beforeEach(() => {
    props = {};

    const Component = () => <Tooltip {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
