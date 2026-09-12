import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { TooltipProviderProps } from '../TooltipProvider';
import { TooltipProvider } from '../TooltipProvider';

describe('TooltipProvider Component', () => {
  let component: RenderResult;
  let props: TooltipProviderProps;

  beforeEach(() => {
    props = { children: <span>Provider child</span> };

    const Component = () => <TooltipProvider {...props} />;
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders tooltip provider children', () => {
    expect(component.getByText('Provider child')).toBeInTheDocument();
  });
});
