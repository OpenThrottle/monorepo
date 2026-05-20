import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TooltipTrigger } from '../TooltipTrigger';
import type { TooltipTriggerProps } from '../TooltipTrigger';

describe('TooltipTrigger Component', () => {
  let component: RenderResult;
  let props: TooltipTriggerProps;

  beforeEach(() => {
    props = {};

    const Component = () => <TooltipTrigger {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('should render', () => {
    expect(component.baseElement).toMatchSnapshot();
  });
});
