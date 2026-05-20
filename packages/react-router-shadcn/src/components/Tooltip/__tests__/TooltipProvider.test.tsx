import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TooltipProvider } from '../TooltipProvider';
import type { TooltipProviderProps } from '../TooltipProvider';

describe('TooltipProvider Component', () => {
  let component: RenderResult;
  let props: TooltipProviderProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TooltipProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
