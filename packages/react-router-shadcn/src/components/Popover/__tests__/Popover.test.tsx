import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import * as React from 'react';
import { createRoutesStub } from 'react-router';
import { beforeEach, describe, expect, test } from 'vitest';

import type { PopoverProps } from '../Popover';
import { Popover } from '../Popover';
import { PopoverContent } from '../PopoverContent';
import { PopoverTrigger } from '../PopoverTrigger';

describe('Popover Component', () => {
  let component: RenderResult;
  let props: PopoverProps;

  beforeEach(() => {
    props = { children: undefined };

    const Component = () => (
      <Popover {...props} open={true}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Popover body</PopoverContent>
      </Popover>
    );
    const RoutesStub = createRoutesStub([{ Component, path: '/' }]);

    component = render(<RoutesStub />);
  });

  test('renders popover content when open', () => {
    expect(component.getByText('Popover body')).toBeInTheDocument();
  });
});
