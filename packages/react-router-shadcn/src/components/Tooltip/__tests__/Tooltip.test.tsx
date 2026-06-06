import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { Tooltip } from '../Tooltip';
import type { TooltipProps } from '../Tooltip';
import { TooltipContent } from '../TooltipContent';
import { TooltipProvider } from '../TooltipProvider';
import { TooltipTrigger } from '../TooltipTrigger';

describe('Tooltip Component', () => {
  let component: RenderResult;
  let props: TooltipProps;

  beforeEach(() => {
    props = { children: undefined };

    const Component = () => (
      <TooltipProvider>
        <Tooltip {...props} open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Tip text</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders tooltip content when open', () => {
    expect(
      component.getByRole('button', { name: 'Hover' }),
    ).toBeInTheDocument();
    expect(
      document.body.querySelector('[data-slot="tooltip-content"]'),
    ).toHaveTextContent('Tip text');
  });
});
