import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TooltipContent } from '../TooltipContent';
import type { TooltipContentProps } from '../TooltipContent';

describe('TooltipContent Component', () => {
  let component: RenderResult;
  let props: TooltipContentProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TooltipContent {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
