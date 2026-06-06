import * as React from 'react';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';
import { TooltipTrigger } from '../TooltipTrigger';
import type { TooltipTriggerProps } from '../TooltipTrigger';
import { Tooltip } from '../Tooltip';
import { TooltipProvider } from '../TooltipProvider';

describe('TooltipTrigger Component', () => {
  let component: RenderResult;
  let props: TooltipTriggerProps;

  beforeEach(() => {
    props = { children: 'Hover me' };

    const Component = () => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger {...props} />
        </Tooltip>
      </TooltipProvider>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders a tooltip trigger', () => {
    expect(
      component.getByRole('button', { name: 'Hover me' }),
    ).toBeInTheDocument();
  });
});
