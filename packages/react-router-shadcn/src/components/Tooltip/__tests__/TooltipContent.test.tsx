import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TooltipContent } from '../TooltipContent';
import type { TooltipContentProps } from '../TooltipContent';
import { Tooltip } from '../Tooltip';
import { TooltipProvider } from '../TooltipProvider';
import { TooltipTrigger } from '../TooltipTrigger';

describe('TooltipContent Component', () => {
  let component: RenderResult;
  let props: TooltipContentProps;

  beforeEach(() => {
    props = { children: 'Tooltip body' };

    const Component = () => (
      <TooltipProvider>
        <Tooltip open={true}>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent {...props} />
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
    ).toHaveTextContent('Tooltip body');
  });
});
